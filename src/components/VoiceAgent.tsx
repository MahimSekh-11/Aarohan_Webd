import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore, LANGUAGE_NAMES } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { useT } from './Translate';
import { startPcmRecording } from '../lib/audio';
import { parseNativeCommand, speechLocales, type VoiceIntent } from '../../shared/voiceCommands';

interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}

export default function VoiceAgent() {
  const t = useT();
  const language = useLanguageStore(s => s.currentLang);
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('Ask me to search products, open your dashboard or requests, or add a product.');
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const draftRef = useRef(draft); draftRef.current = draft;
  const recognition = useRef<Recognition | null>(null);
  const pcm = useRef<Awaited<ReturnType<typeof startPcmRecording>> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = useRef(0);
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const nativeVoice = voices.find(v => v.lang.split('-')[0] === language);

  function cancelCapture() {
    session.current++;
    if (timer.current) clearTimeout(timer.current);
    recognition.current?.abort(); recognition.current = null;
    pcm.current?.cancel(); pcm.current = null;
    controller.current?.abort(); controller.current = null;
    locked.current = false;
    window.speechSynthesis?.cancel();
  }
  useEffect(() => {
    setRecording(false); setBusy(false); setTranscript(''); setDraft(null);
    return cancelCapture;
  }, [language]);
  useEffect(() => {
    const update = () => setVoices(window.speechSynthesis?.getVoices() || []);
    update(); window.speechSynthesis?.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', update);
  }, []);

  function respond(message: string) {
    setReply(message);
    if (!nativeVoice || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(t(message));
    utterance.lang = speechLocales[language]; utterance.voice = nativeVoice;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
  }
  async function saveDraft() {
    const product = draftRef.current;
    if (!product || user?.role !== 'manager' || !token) { respond('There is no product waiting for confirmation.'); return; }
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(product) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not create product');
      setDraft(null); draftRef.current = null;
      window.dispatchEvent(new Event('products-updated'));
      navigate('/manager'); respond('Product saved successfully.');
    } catch (error) { respond(error instanceof Error ? error.message : 'Could not create product'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function execute(intent: VoiceIntent) {
    if (intent.action === 'confirm') { await saveDraft(); return; }
    if (intent.action === 'cancel') { setDraft(null); draftRef.current = null; respond('Cancelled'); return; }
    if (intent.action === 'create_product') { setDraft(intent.data!); draftRef.current = intent.data!; }
    if (intent.action === 'search_product') navigate(`/marketplace?search=${encodeURIComponent(intent.data!.search)}`);
    if (intent.action === 'navigate') navigate(intent.data!.path);
    respond(intent.message);
  }
  async function handleText(value: string) {
    if (!value.trim()) { respond('No speech detected. Please try again.'); return; }
    setTranscript(value); setText('');
    await execute(parseNativeCommand(value, user?.role));
  }
  async function stopPcm(id: number) {
    const capture = pcm.current; pcm.current = null;
    if (!capture) return;
    setRecording(false); setBusy(true); locked.current = true;
    try {
      const audio = await capture.stop();
      const form = new FormData(); form.append('audio', audio, 'recording.wav'); form.append('language', language);
      controller.current = new AbortController();
      const timeout = setTimeout(() => controller.current?.abort(), 120000);
      let response: Response;
      try { response = await fetch('/api/ai/transcribe-and-intent', { method: 'POST', body: form, signal: controller.current.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
      finally { clearTimeout(timeout); }
      const data = await response.json();
      if (id !== session.current) return;
      if (!response.ok) throw new Error(data.message || 'Speech service unavailable. You can type your command.');
      locked.current = false; setBusy(false);
      await handleText(data.transcript);
    } catch (error) { if (id === session.current) respond(error instanceof Error && error.name !== 'AbortError' ? error.message : 'Speech service unavailable. You can type your command.'); }
    finally { if (id === session.current) { setBusy(false); locked.current = false; } }
  }
  async function toggleRecording() {
    setOpen(true);
    if (recording) {
      if (timer.current) clearTimeout(timer.current);
      recognition.current?.stop();
      if (pcm.current) await stopPcm(session.current);
      return;
    }
    if (locked.current) return;
    locked.current = true; window.speechSynthesis?.cancel();
    const id = ++session.current;
    setTranscript('');
    const Constructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (Constructor) {
      const instance: Recognition = new Constructor(); recognition.current = instance;
      instance.lang = speechLocales[language]; instance.continuous = false; instance.interimResults = true;
      let final = ''; let failed = false;
      instance.onresult = event => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (id === session.current) setTranscript(final || interim);
      };
      instance.onerror = event => {
        failed = true;
        if (id !== session.current) return;
        respond(event.error === 'not-allowed' ? 'Microphone permission denied. Allow microphone access in your browser.' : 'Speech service unavailable. Try audio fallback or type your command.');
      };
      instance.onend = () => {
        if (id !== session.current) return;
        if (timer.current) clearTimeout(timer.current);
        recognition.current = null; setRecording(false); locked.current = false;
        if (!failed) void handleText(final);
      };
      try { instance.start(); setRecording(true); timer.current = setTimeout(() => instance.stop(), 30000); }
      catch { locked.current = false; respond('Speech service unavailable. Try audio fallback or type your command.'); }
    } else { locked.current = false; await startFallback(); }
  }
  async function startFallback() {
    if (locked.current || recording) return;
    locked.current = true; setOpen(true);
    const id = ++session.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone requires a supported browser and HTTPS.');
      const capture = await startPcmRecording();
      if (id !== session.current) { capture.cancel(); return; }
      pcm.current = capture; setRecording(true);
      timer.current = setTimeout(() => void stopPcm(id), 30000);
    } catch (error) { respond(error instanceof Error ? error.message : 'Could not access microphone'); }
    finally { if (id === session.current) locked.current = false; }
  }
  return <aside className="fixed bottom-6 right-4 sm:right-6 z-50">
    {open && <section aria-label={t('Voice Assistant')} className="mb-3 w-[min(360px,calc(100vw-32px))] rounded-2xl bg-[#1E293B] border border-[#334155] p-4 shadow-2xl space-y-3 text-white">
      <div className="flex justify-between items-center"><h2 className="font-bold">{t('Voice Assistant')} · {LANGUAGE_NAMES[language]}</h2><button aria-label={t('Close')} onClick={() => { cancelCapture(); setRecording(false); setBusy(false); setOpen(false); }}><X size={18}/></button></div>
      <p role="status" className="text-sm text-emerald-300">{t(recording ? 'Listening...' : busy ? 'Processing...' : reply)}</p>
      {transcript && <p className="text-sm break-words"><strong>{t('You said:')}</strong> {transcript}</p>}
      {!nativeVoice && <p className="text-xs text-slate-300">{t('A native voice is not installed. Replies appear as text.')}</p>}
      {draft && <div className="rounded-lg bg-slate-900 p-3 text-sm space-y-2">
        <p>{draft.name} · ₹{draft.price} · {draft.quantity} {t('units')}</p>
        <div className="flex gap-3"><button disabled={busy} className="bg-emerald-600 rounded px-3 py-2" onClick={saveDraft}>{t('Confirm')}</button><button onClick={() => { setDraft(null); draftRef.current = null; respond('Cancelled'); }}>{t('Cancel')}</button></div>
      </div>}
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (!busy && !recording) void handleText(text); }}>
        <input aria-label={t('Type a command')} placeholder={t('Type a command')} value={text} onChange={event => setText(event.target.value)} className="min-w-0 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm"/>
        <button aria-label={t('Send')} disabled={busy || recording} className="p-2 bg-emerald-600 rounded-lg"><Send size={18}/></button>
      </form>
      <button disabled={busy || recording} onClick={startFallback} className="text-xs underline">{t('Use audio fallback')}</button>
    </section>}
    <button onClick={toggleRecording} disabled={busy} aria-label={t(recording ? 'Stop Recording' : 'Speak to Agent')} className={`ml-auto w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white ${recording ? 'bg-red-500 animate-pulse' : 'bg-emerald-600'} disabled:opacity-50`}>
      {busy ? <Loader2 className="animate-spin"/> : recording ? <MicOff/> : <Mic/>}
    </button>
  </aside>;
}
