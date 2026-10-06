import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, X, Send, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore, LANGUAGE_NAMES } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { useT } from './Translate';
import { startPcmRecording } from '../lib/audio';
import { parseNativeCommand, speechLocales, type VoiceIntent } from '../../shared/voiceCommands';
import { productComplete } from '../../shared/productVoice';

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
  const [autoSave, setAutoSave] = useState(true);
  const draftRef = useRef(draft); draftRef.current = draft;
  const recognition = useRef<Recognition | null>(null);
  const pcm = useRef<Awaited<ReturnType<typeof startPcmRecording>> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = useRef(0);
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const nativeVoice = voices.find(v => v.lang.split('-')[0] === language);
  const playback = useRef<AudioContext | null>(null);
  const speaker = useRef<AudioBufferSourceNode | null>(null);
  const speechRequest = useRef<AbortController | null>(null);
  const speechVersion = useRef(0);
  const followup = useRef(false);
  const continueListening = useRef<() => void>(() => {});
  continueListening.current = () => {
    if (followup.current && open && autoSave && draftRef.current && !productComplete(draftRef.current)) {
      followup.current = false;
      void toggleRecording();
    }
  };
  const [speechError, setSpeechError] = useState('');
  const [engineState, setEngineState] = useState('idle');
  useEffect(() => {
    if (!open) return;
    setEngineState('loading');
    const abort = new AbortController(); let stopped = false;
    let next: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const response = await fetch('/api/ai/speech/status',{ signal:abort.signal });
        if (!response.ok) throw new Error('Server unavailable');
        const status = await response.json();
        if (stopped) return;
        setEngineState(status.state);
        next = setTimeout(check,status.state === 'ready' ? 15000 : 3000);
      } catch { if (!stopped) { setEngineState('error'); next = setTimeout(check,3000); } }
    }
    void check();
    return () => { stopped = true; clearTimeout(next); abort.abort(); };
  }, [open]);
  function unlockSpeaker() {
    playback.current ??= new AudioContext();
    void playback.current.resume();
  }
  function stopSpeaking() {
    speechVersion.current++;
    speechRequest.current?.abort();
    speaker.current?.stop(); speaker.current = null;
    window.speechSynthesis?.cancel();
  }

  function cancelCapture() {
    followup.current = false;
    session.current++;
    if (timer.current) clearTimeout(timer.current);
    recognition.current?.abort(); recognition.current = null;
    pcm.current?.cancel(); pcm.current = null;
    controller.current?.abort(); controller.current = null;
    locked.current = false;
    stopSpeaking();
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
  useEffect(() => () => { void playback.current?.close(); }, []);

  function respond(message: string) {
    setReply(message);
    void speakReply(t(message));
  }
  async function speakReply(message: string, serverOnly = false) {
    stopSpeaking(); setSpeechError('');
    const version = speechVersion.current;
    if (nativeVoice && !serverOnly && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = speechLocales[language]; utterance.voice = nativeVoice;
      utterance.onend = () => { if (version === speechVersion.current) continueListening.current(); };
      utterance.onerror = event => { if (!['interrupted','canceled'].includes(event.error) && version === speechVersion.current) void speakReply(message,true); };
      window.speechSynthesis.speak(utterance); return;
    }
    try {
      speechRequest.current = new AbortController();
      const response = await fetch('/api/ai/speak', { method:'POST', signal:speechRequest.current.signal,
        headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ text:message.slice(0,1000), language }) });
      if (!response.ok) throw new Error('Speech playback failed');
      const audio = await response.arrayBuffer();
      if (version !== speechVersion.current) return;
      unlockSpeaker();
      const decoded = await playback.current!.decodeAudioData(audio);
      if (version !== speechVersion.current) return;
      const source = playback.current!.createBufferSource(); source.buffer = decoded;
      source.onended = () => { if (version === speechVersion.current) continueListening.current(); };
      source.connect(playback.current!.destination); speaker.current = source; source.start();
    } catch (error) {
      if (version === speechVersion.current && (error as Error).name !== 'AbortError') setSpeechError('Could not play spoken reply. Tap replay to try again.');
    }
  }
  async function saveDraft() {
    const product = draftRef.current;
    if (!product || user?.role !== 'manager' || !token) { respond('There is no product waiting for confirmation.'); return; }
    if (!productComplete(product)) { respond(parseNativeCommand('',user.role,product).message); return; }
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
  async function execute(intent: VoiceIntent, confident = true) {
    if (intent.action === 'confirm') { await saveDraft(); return; }
    if (intent.action === 'cancel') { setDraft(null); draftRef.current = null; respond('Cancelled'); return; }
    if (intent.action === 'create_product') {
      setDraft(intent.data!); draftRef.current = intent.data!;
      followup.current = !productComplete(intent.data);
      if (autoSave && confident && productComplete(intent.data)) { await saveDraft(); return; }
    }
    if (intent.action === 'search_product' || intent.action === 'navigate') { setDraft(null); draftRef.current = null; }
    if (intent.action === 'search_product') navigate(`/marketplace?search=${encodeURIComponent(intent.data!.search)}`);
    if (intent.action === 'navigate') navigate(intent.data!.path);
    if (intent.action === 'website_control') {
      const command = intent.data!.command;
      if (command === 'scroll_down' || command === 'scroll_up') window.scrollBy({ top:(command === 'scroll_down' ? 1 : -1) * window.innerHeight * 0.8, behavior:'smooth' });
      if (command === 'back') navigate(-1);
      if (command === 'read') {
        const content = document.querySelector('main')?.textContent?.trim().slice(0,800);
        if (content) { setReply('Reading this page'); void speakReply(content); return; }
      }
    }
    respond(intent.message);
  }
  async function handleText(value: string, confident = true) {
    if (!value.trim()) { respond('No speech detected. Please try again.'); return; }
    setTranscript(value); setText('');
    await execute(parseNativeCommand(value, user?.role, draftRef.current), confident);
  }
  async function stopPcm(id: number) {
    const capture = pcm.current; pcm.current = null;
    if (!capture) return;
    setRecording(false); setBusy(true); locked.current = true;
    try {
      const audio = await capture.stop();
      const form = new FormData(); form.append('audio', audio, 'recording.wav'); form.append('language', language);
      controller.current = new AbortController();
      const timeout = setTimeout(() => controller.current?.abort(), 300000);
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
    unlockSpeaker();
    if (recording) {
      if (timer.current) clearTimeout(timer.current);
      if (recognition.current) recognition.current.stop();
      else if (pcm.current) await stopPcm(session.current);
      return;
    }
    if (locked.current) return;
    locked.current = true; stopSpeaking();
    const id = ++session.current;
    setTranscript('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone requires a supported browser and HTTPS.');
      const capture = await startPcmRecording(() => {
        if (id !== session.current) return;
        if (recognition.current) recognition.current.stop();
        else void stopPcm(id);
      });
      if (id !== session.current) { capture.cancel(); return; }
      pcm.current = capture; setRecording(true);
    } catch (error) {
      locked.current = false;
      respond('Microphone permission denied. Allow microphone access in your browser.'); return;
    }
    const Constructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (Constructor) {
      const instance: Recognition = new Constructor(); recognition.current = instance;
      instance.lang = speechLocales[language]; instance.continuous = false; instance.interimResults = true;
      let final = ''; let failed = false; let confident = true;
      instance.onresult = event => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += ' ' + event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;
            if (typeof confidence === 'number' && confidence < 0.7) confident = false;
          }
          else interim += event.results[i][0].transcript;
        }
        if (id === session.current) setTranscript(final || interim);
      };
      instance.onerror = event => {
        failed = true;
        if (id !== session.current) return;
        // Keep the PCM recording alive; the browser service is optional.
        recognition.current = null;
        setReply('Listening...');
      };
      instance.onend = () => {
        if (id !== session.current) return;
        if (timer.current) clearTimeout(timer.current);
        recognition.current = null; locked.current = false;
        if (!failed && final.trim()) {
          pcm.current?.cancel(); pcm.current = null; setRecording(false);
          void handleText(final.trim(), confident);
        } else if (pcm.current) {
          // A service error can arrive before the user starts speaking.
          // Leave recording active until silence detection or a second tap.
          if (!failed) void stopPcm(id);
          else timer.current = setTimeout(() => void stopPcm(id),30000);
        }
      };
      try { instance.start(); setRecording(true); timer.current = setTimeout(() => instance.stop(), 30000); }
      catch { recognition.current = null; locked.current = false; timer.current = setTimeout(() => void stopPcm(id),30000); }
    } else { locked.current = false; timer.current = setTimeout(() => void stopPcm(id),30000); }
  }
  async function startFallback() {
    if (locked.current || recording) return;
    locked.current = true; setOpen(true);
    unlockSpeaker(); stopSpeaking();
    const id = ++session.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone requires a supported browser and HTTPS.');
      const capture = await startPcmRecording(() => { if (id === session.current) void stopPcm(id); });
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
      {engineState === 'loading' && <p className="text-xs text-slate-300">{t('Preparing local speech recognition...')}</p>}
      {engineState === 'error' && <p className="text-xs text-amber-300">{t('Local speech engine is unavailable. Check that the backend server is running.')}</p>}
      {transcript && <p className="text-sm break-words"><strong>{t('You said:')}</strong> {transcript}</p>}
      {speechError && <p role="alert" className="text-xs text-amber-300">{t(speechError)}</p>}
      <button aria-label={t('Replay reply')} onClick={() => { unlockSpeaker(); void speakReply(t(reply)); }} className="flex gap-2 items-center text-xs"><Volume2 size={16}/>{t('Replay reply')}</button>
      {user?.role === 'manager' && <label className="flex gap-2 items-center text-xs"><input type="checkbox" checked={autoSave} onChange={event => setAutoSave(event.target.checked)}/>{t('Save complete products automatically')}</label>}
      {draft && <div className="rounded-lg bg-slate-900 p-3 text-sm space-y-2">
        {(['name','price','quantity'] as const).map(field => <label key={field} className="flex items-center gap-2"><span className="w-20">{t(field === 'name' ? 'Product Name' : field === 'price' ? 'Price' : 'Quantity')}</span><input aria-label={t(field === 'name' ? 'Product Name' : field === 'price' ? 'Price' : 'Quantity')} type={field === 'name' ? 'text' : 'number'} min={field === 'name' ? undefined : 0.01} step="any" value={draft[field] ?? ''} className="min-w-0 w-full rounded bg-slate-800 px-2 py-1" onChange={event => { const next = { ...draft, [field]:field === 'name' ? event.target.value : Number(event.target.value) }; if (field === 'price') next.actualPrice=next.price; setDraft(next); draftRef.current=next; }}/></label>)}
        <div className="flex gap-3"><button disabled={busy || !productComplete(draft)} className="bg-emerald-600 rounded px-3 py-2 disabled:opacity-50" onClick={saveDraft}>{t('Confirm')}</button><button onClick={() => { setDraft(null); draftRef.current = null; respond('Cancelled'); }}>{t('Cancel')}</button></div>
      </div>}
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); unlockSpeaker(); if (!busy && !recording) void handleText(text); }}>
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
