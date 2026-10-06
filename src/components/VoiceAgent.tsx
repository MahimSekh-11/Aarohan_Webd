import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, MicOff, Loader2, X, Send, Volume2, VolumeX, Square, Sparkles, Trash2, ChevronDown, ShieldCheck, Brain, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore, LANGUAGE_NAMES, type Language } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { useT } from './Translate';
import { agentLanguages, detectAgentLanguage, type AgentLanguage } from '../../shared/agentLanguages';
import { type AgentMessage, type AgentResult } from '../../shared/agent';
import { productComplete } from '../../shared/productVoice';
import { useVoiceInput } from '../agent/useVoiceInput';
import { useVoiceOutput } from '../agent/useVoiceOutput';
import { useAgentMemory } from '../agent/memory';
import { getWebsiteContext } from '../agent/context';
import { t as translateReply } from '../i18n/translations';
import { parseMemoryInstruction } from '../../shared/memoryCommands';
import { isVoiceConfirmation, isVoiceCancellation } from '../../shared/voiceCommands';
import {pageNavigation} from '../../shared/catalogCommands';

export default function VoiceAgent() {
  const t=useT(),navigate=useNavigate();
  const currentLang=useLanguageStore(s => s.currentLang),setUILanguage=useLanguageStore(s => s.setLanguage);
  const {user,token}=useAuthStore();const memory=useAgentMemory();
  const [open,setOpen]=useState(false),[text,setText]=useState(''),[busy,setBusy]=useState(false),[autoSave,setAutoSave]=useState(true),[showMemory,setShowMemory]=useState(false);
  const [language,setLanguage]=useState<AgentLanguage>((memory.enabled && memory.language) || currentLang),[replyLanguage,setReplyLanguage]=useState<AgentLanguage>(currentLang);
  const [history,setHistory]=useState<AgentMessage[]>([]),[reply,setReply]=useState('Ask me to search products, open your dashboard or requests, or add a product.');
  const [draft,setDraft]=useState<Record<string,any>>(null),[pending,setPending]=useState<AgentResult['pending']>(null),[error,setError]=useState(''),[engineState,setEngineState]=useState('idle'),[cloudSpeech,setCloudSpeech]=useState(false);
  const task=useRef<{draft?:Record<string,any>;search?:Record<string,unknown>;items?:any[]}>({}),request=useRef<AbortController>(null),locked=useRef(false),voiceSession=useRef(false),followup=useRef(false),alive=useRef(true),scroll=useRef<HTMLDivElement>(null);
  const latest=useRef<any>({});const previousUILanguage=useRef(currentLang);
  const output=useVoiceOutput(() => {if(followup.current && voiceSession.current && latest.current.open){followup.current=false;void latest.current.start();}});
  const input=useVoiceInput(language,(value,confident,detected) => {void handleText(value,confident,undefined,detected);},message => {setError(message);voiceSession.current=false;});
  latest.current={open,start:() => input.start()};
  useEffect(() => {alive.current=true;return () => {alive.current=false;request.current?.abort();};},[]);
  useEffect(()=>{request.current?.abort();input.cancel();output.stop();setHistory([]);setDraft(null);setPending(null);task.current={};voiceSession.current=false;},[user?._id]);
  useEffect(() => {const handler=() => setOpen(true);window.addEventListener('agent-open',handler);return () => window.removeEventListener('agent-open',handler);},[]);
  useEffect(()=>{const handler=(event:Event)=>{const command=(event as CustomEvent).detail;if(typeof command==='string'){setOpen(true);setText(command.slice(0,1500));}};window.addEventListener('agent-example',handler);return()=>window.removeEventListener('agent-example',handler);},[]);
  useEffect(() => {scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'smooth'});},[history,input.transcript]);
  useEffect(() => {
    if(previousUILanguage.current===currentLang)return;previousUILanguage.current=currentLang;
    if(language!=='auto' && agentLanguages[language].base !== currentLang){setLanguage(currentLang);}
    output.stop();input.cancel();voiceSession.current=false;followup.current=false;
  },[currentLang]);
  useEffect(() => {
    if(!open)return;let stop=false;let timer:ReturnType<typeof setTimeout>;const abort=new AbortController();setEngineState('loading');
    const check=async () => {try {const response=await fetch('/api/ai/speech/status',{signal:abort.signal});if(!response.ok)throw new Error();const data=await response.json();if(!stop){setEngineState(data.state);setCloudSpeech(data.model==='cloud');timer=setTimeout(check,data.state==='ready' ? 20000 : 3000);}}catch{if(!stop){setEngineState('error');timer=setTimeout(check,3000);}}};
    void check();return () => {stop=true;clearTimeout(timer);abort.abort();};
  },[open]);
  function close(){voiceSession.current=false;followup.current=false;input.cancel();output.stop();request.current?.abort();request.current=null;setBusy(false);locked.current=false;setOpen(false);}
  function respond(message:string,lang:AgentLanguage=language==='auto' ? replyLanguage : language){message=translateReply(message,agentLanguages[lang].base as Language);setReply(message);setReplyLanguage(lang);setHistory(h => [...h,{role:'assistant',text:message}].slice(-20) as AgentMessage[]);void output.speak(message,lang);}
  function chooseLanguage(value:AgentLanguage){input.cancel();output.stop();setLanguage(value);memory.remember('language',value);const base=agentLanguages[value].base;if(value!=='auto' && Object.hasOwn(LANGUAGE_NAMES,base))setUILanguage(base as Language);}
  function rememberCommand(value:string):boolean {
    const instruction=parseMemoryInstruction(value);if(!instruction)return false;
    if(instruction.action==='forget'){memory.forget(instruction.key);respond('Saved preferences cleared.');return true;}
    const saved=instruction.action==='remember' && memory.remember(instruction.key,instruction.value);
    if(saved && instruction.action==='remember' && instruction.key==='language')chooseLanguage(instruction.value as AgentLanguage);
    respond(saved ? 'Preference saved on this device.' : 'I can only remember language, budget and category preferences.');return true;
  }
  async function handleText(value:string,confident=true,override?:Record<string,any>,detected?:AgentLanguage){
    if(locked.current || !value.trim())return;setError('');setText('');
    const messages=[...history,{role:'user',text:value}] as AgentMessage[];setHistory(messages.slice(-20));
    if(rememberCommand(value))return;
    if(isVoiceCancellation(value)){setDraft(null);setPending(null);task.current.draft=undefined;followup.current=false;voiceSession.current=false;respond('Cancelled');return;}
    const page=!pending&&!draft?pageNavigation(value,user?.role):undefined;
    if(page&&!/requests|leads/.test(page)){followup.current=false;navigate(page);respond('Opening page',language==='auto'&&detected?detected:undefined);return;}
    locked.current=true;setBusy(true);output.stop();
    const controller=new AbortController();request.current=controller;const timer=setTimeout(() => controller.abort(new DOMException('Timed out','TimeoutError')),45000);
    try {
      const reviewing=override || (isVoiceConfirmation(value) && draft ? draft : undefined);
      const body={message:reviewing ? `add product name ${reviewing.name}, price ${reviewing.price}, quantity ${reviewing.quantity}` : value,language:language==='auto' && detected?detected:language,history:messages.slice(-10),context:{recentItems:task.current.items,search:task.current.search,draft:reviewing || task.current.draft,...getWebsiteContext()},pending:pending?.id,autoSave:reviewing ? true : autoSave,confident,preferences:memory.enabled ? {budget:memory.budget,category:memory.category} : {}};
      const response=await fetch('/api/agent/message',{method:'POST',headers:{'Content-Type':'application/json',...(token ? {Authorization:`Bearer ${token}`} : {})},body:JSON.stringify(body),signal:controller.signal});
      const result:AgentResult=await response.json();if(!response.ok || !result.reply)throw new Error((result as any).message || 'The assistant could not finish this request. Please try again.');
      if(!alive.current || controller.signal.aborted)return;
      setDraft(result.draft || null);setPending(result.pending || null);task.current.draft=result.draft;
      if(result.items)task.current.items=result.items;if(result.search)task.current.search=result.search;
      followup.current=!!result.pending || (!!result.draft && !productComplete(result.draft));
      for(const action of result.actions){
        if(action.type==='navigate' && action.path && /^\/(?!\/)/.test(action.path)){
          const destination=new URL(action.path,window.location.origin);
          if(window.location.pathname==='/marketplace'&&destination.pathname==='/marketplace'&&destination.searchParams.has('product')&&[...destination.searchParams.keys()].length===1){
            const filters=new URLSearchParams(window.location.search);filters.set('product',destination.searchParams.get('product')!);navigate(`/marketplace?${filters}`);
          }else navigate(action.path);
        }
        if(action.type==='refresh'){window.dispatchEvent(new Event('products-updated'));window.dispatchEvent(new Event('requests-updated'));window.dispatchEvent(new Event('account-updated'));}
        if(action.type==='website_control'){
          if(action.command==='back')navigate(-1);
          if(['scroll_down','scroll_up'].includes(action.command))window.scrollBy({top:window.innerHeight*(action.command==='scroll_down' ? 0.8 : -0.8),behavior:'smooth'});
          if(action.command==='read'){const content=document.querySelector('main')?.textContent?.trim().slice(0,800);if(content){result.reply=content;if(agentLanguages[result.language].base!==currentLang){const translation=await fetch('/api/ai/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:content,sourceLang:'auto',targetLang:agentLanguages[result.language].base}),signal:controller.signal});if(!translation.ok)throw new Error('Could not play spoken reply. Tap replay to try again.');result.reply=(await translation.json()).translatedText;}}}
        }
      }
      respond(result.reply,result.language);
    }catch(e){if(alive.current && (!controller.signal.aborted || controller.signal.reason?.name==='TimeoutError')){followup.current=false;setError(controller.signal.reason?.name==='TimeoutError' ? 'The assistant request timed out. Please try again.' : (e as Error).name==='TypeError'?'The assistant could not finish this request. Please try again.':(e as Error).message);}}
    finally{clearTimeout(timer);if(request.current===controller){locked.current=false;if(alive.current)setBusy(false);}}
  }
  function startVoice(serverOnly=false){setOpen(true);setError('');voiceSession.current=true;output.unlock();output.stop();if(input.listening){voiceSession.current=false;input.stop();}else void input.start(serverOnly);}
  const status=input.listening ? 'Listening...' : input.processing || busy ? 'Processing...' : output.speaking ? 'Speaking...' : error || output.error ? 'Try again' : 'Ready to help';
  return <aside className="voice-dock" aria-label={t('Voice Assistant')}>
    <AnimatePresence>{open && <motion.section initial={{opacity:0,y:18,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:0.97}} id="voice-assistant-panel" className="agent-panel" aria-label={t('Voice Assistant')}>
      <div className="agent-header"><div className="agent-emblem"><Sparkles size={20}/></div><div className="flex-1"><h2>{t('Voice Assistant')}</h2><p className="agent-status" role="status"><span className={input.listening ? 'status-dot listening' : 'status-dot'}/>{t(status)}</p></div><button className="icon-button" aria-label={t('Close')} onClick={close}><X size={18}/></button></div>
      <div className="agent-language"><label htmlFor="agent-language">{t('Language')}</label><select id="agent-language" aria-label={t('Assistant language')} value={language} onChange={e => chooseLanguage(e.target.value as AgentLanguage)}>{Object.entries(agentLanguages).map(([key,value]) => <option key={key} value={key}>{key==='auto'?t('Auto Detect'):value.name}</option>)}</select><button className="icon-button" aria-label={t('Voice command help')} onClick={()=>{close();navigate('/help');}}>?</button></div>
      <div ref={scroll} className="agent-conversation" role="log" aria-live="polite" aria-relevant="additions">
        {history.length===0 && <div className="agent-welcome"><div className="voice-orb"><Mic size={27}/></div><h3>{t('How can I help?')}</h3><p>{t('Ask me to search products, open your dashboard or requests, or add a product.')}</p><div className="agent-suggestions">{['Explore Marketplace','My Requests'].map(label => <button key={label} onClick={() => void handleText(label==='My Requests' ? 'show my requests' : 'open marketplace')}>{t(label)}</button>)}</div></div>}
        {history.map((message,index) => <div className={`chat-message ${message.role}`} key={index}><span>{message.role==='user' ? t('You said:') : t('Voice Assistant')}</span><p dir="auto" lang={agentLanguages[detectAgentLanguage(message.text)].base}>{message.text}</p></div>)}
        {input.listening && <div className="transcript-live"><div className="voice-bars">{[0,1,2,3,4].map(n => <i key={n} style={{animationDelay:`${n*0.12}s`}}/>)}</div><p>{input.transcript || t('Listening...')}</p></div>}
        {engineState==='loading' && <p className="agent-note">{t('Preparing local speech recognition...')}</p>}
        {engineState==='error' && <p className="agent-note">{t('Local speech engine is unavailable. Check that the backend server is running.')}</p>}
        {(error || output.error) && <p className="agent-error" role="alert">{t(error || output.error)}</p>}
        {draft && <div className="agent-draft">{(['name','price','quantity'] as const).map(field => <label key={field}>{t(field==='name' ? 'Product Name' : field==='price' ? 'Price' : 'Quantity')}<input aria-label={t(field==='name' ? 'Product Name' : field==='price' ? 'Price' : 'Quantity')} type={field==='name' ? 'text' : 'number'} min={field==='name' ? undefined : field==='quantity'?1:0.01} step={field==='quantity'?'1':'any'} value={draft[field] ?? ''} onChange={e => setDraft({...draft,[field]:field==='name' ? e.target.value : Number(e.target.value)})}/></label>)}<div className="flex gap-2"><button className="button-primary" disabled={busy || !productComplete(draft)} onClick={() => void handleText('confirm',true,draft)}>{t('Confirm')}</button><button className="button-secondary" onClick={() => void handleText('cancel')}>{t('Cancel')}</button></div></div>}
        {pending && <div className="agent-draft"><p>{reply}</p>{pending.name==='update_product'&&<dl className="space-y-2">{Object.entries(pending.args).filter(([key])=>!['id','search'].includes(key)).map(([key,value])=><div className="flex justify-between gap-3" key={key}><dt>{t(({name:'Product Name',description:'Description',price:'Price',quantity:'Quantity',category:'Category',offer:'Offer / Discount (%)',deliveryAvailable:'Delivery Available'} as Record<string,string>)[key] || key)}</dt><dd>{typeof value==='boolean'?t(value?'Available':'Not Available'):String(value)}</dd></div>)}</dl>}<div className="flex gap-2"><button className="button-primary" disabled={busy} onClick={() => void handleText('confirm')}>{t('Confirm')}</button><button className="button-secondary" onClick={() => void handleText('cancel')}>{t('Cancel')}</button></div></div>}
        {showMemory && <div className="agent-draft"><h3>{t('Saved preferences')}</h3><label className="flex gap-2"><input type="checkbox" checked={memory.enabled} onChange={e => memory.setEnabled(e.target.checked)}/>{t('Enable memory')}</label>{(['language','budget','category'] as const).filter(key => memory[key]!==undefined).map(key => <div className="flex justify-between items-center" key={key}><span>{t(key==='language'?'Language':key==='budget'?'Budget':'Category')}: {key==='language'?agentLanguages[memory.language!].name:key==='category'?t(memory.category!):String(memory.budget)}</span><button className="icon-button" aria-label={t('Forget preference')} onClick={() => memory.forget(key)}><Trash2 size={14}/></button></div>)}<button className="button-secondary" onClick={() => memory.forget()}>{t('Clear memories')}</button></div>}
      </div>
      <div className="agent-toolbar"><button className="icon-button" aria-label={t(output.muted ? 'Unmute' : 'Mute')} onClick={() => output.setMuted(!output.muted)}>{output.muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}</button><button className="icon-button" aria-label={t('Replay reply')} onClick={() => {output.unlock();void output.speak(reply,replyLanguage);}}><MessageCircle size={16}/></button><button className="icon-button" aria-label={t('Stop speaking')} onClick={output.stop}><Square size={14}/></button><button className="icon-button" aria-label={t('Saved preferences')} onClick={() => setShowMemory(!showMemory)}><Brain size={16}/></button><button className="icon-button ml-auto" aria-label={t('Clear conversation')} onClick={() => {input.cancel();output.stop();setHistory([]);setDraft(null);setPending(null);task.current={};voiceSession.current=false;}}><Trash2 size={16}/></button></div>
      {user?.role==='manager' && <label className="agent-autosave"><input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)}/>{t('Save complete products automatically')}</label>}
      <form className="agent-composer" onSubmit={e => {e.preventDefault();output.unlock();if(!busy && !input.listening)void handleText(text);}}><input aria-label={t('Type a command')} placeholder={t('Type a command')} value={text} onChange={e => setText(e.target.value)} maxLength={1500}/><button type="button" className={`icon-button ${input.listening ? 'recording' : ''}`} disabled={busy || input.processing} aria-label={t(input.listening ? 'Stop Recording' : 'Speak to Agent')} onClick={() => startVoice()}>{input.listening ? <MicOff size={19}/> : <Mic size={19}/>}</button><button className="agent-send" aria-label={t('Send')} disabled={busy || input.listening || !text.trim()}>{busy ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}</button></form>
      <div className="agent-footer"><ShieldCheck size={12}/><span title={cloudSpeech?t('Audio is sent to the speech provider'):undefined}>{t(cloudSpeech?'Audio is sent to the speech provider':'Audio is not saved')}</span><button disabled={busy || input.listening} onClick={() => startVoice(true)}>{t('Use audio fallback')}</button></div>
    </motion.section>}</AnimatePresence>
    <button aria-expanded={open} aria-controls="voice-assistant-panel" className={`agent-launcher ${input.listening ? 'recording' : ''}`} disabled={busy || input.processing} aria-label={t(open ? 'Close' : 'Voice Assistant')} onClick={() => open ? close() : startVoice()}>{busy || input.processing ? <Loader2 className="animate-spin"/> : open ? <ChevronDown/> : <Sparkles/>}<span>{t('Voice Assistant')}</span><span className="launcher-mic"><Mic size={16}/></span></button>
  </aside>;
}
