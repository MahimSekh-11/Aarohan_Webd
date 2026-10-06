import { useEffect, useRef, useState } from 'react';
import { agentLanguages, type AgentLanguage } from '../../shared/agentLanguages';
import { speechText, splitSpeech, selectSpeechVoice } from './speechText';
export interface TextToSpeechProvider { speak(text:string, language:AgentLanguage, signal:AbortSignal):Promise<ArrayBuffer> }
export class ServerTextToSpeechProvider implements TextToSpeechProvider {
  constructor(private provider?:'local'|'gemini'){}
  async speak(text:string,language:AgentLanguage,signal:AbortSignal){
    const response=await fetch('/api/ai/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:speechText(text),language:agentLanguages[language].base,...(this.provider?{provider:this.provider}:{})}),signal});
    if(!response.ok)throw new Error('Could not play spoken reply. Tap replay to try again.');
    return response.arrayBuffer();
  }
}
let voicesLoading:Promise<SpeechSynthesisVoice[]>;
async function loadVoices():Promise<SpeechSynthesisVoice[]>{
  const synth=window.speechSynthesis;
  if(!synth)return [];
  if(synth.getVoices().length)return synth.getVoices();
  return voicesLoading ??= new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);synth.removeEventListener?.('voiceschanged',finish);resolve(synth.getVoices());};
    const timer=setTimeout(finish,400);synth.addEventListener?.('voiceschanged',finish,{once:true});
  });
}
export function useVoiceOutput(onFinished?:() => void) {
  const [speaking,setSpeaking]=useState(false),[muted,setMuted]=useState(false),[error,setError]=useState('');
  const audio=useRef<AudioContext>(null),source=useRef<AudioBufferSourceNode>(null),version=useRef(0),controller=useRef<AbortController>(null),done=useRef(onFinished),mute=useRef(muted),natural=useRef(false),utterance=useRef<SpeechSynthesisUtterance>(null),watchdog=useRef<ReturnType<typeof setTimeout>>(null);
  done.current=onFinished;mute.current=muted;
  function unlock(){try{audio.current ??= new AudioContext();void audio.current.resume().catch(()=>{});}catch{setError('Could not play spoken reply. Tap replay to try again.');}}
  function stop(){version.current++;controller.current?.abort();clearTimeout(watchdog.current);if(source.current){source.current.onended=null;try{source.current.stop();}catch{}source.current=null;}if(utterance.current){utterance.current.onend=null;utterance.current.onerror=null;utterance.current=null;}window.speechSynthesis?.cancel();setSpeaking(false);}
  useEffect(()=>{const abort=new AbortController();void fetch('/api/agent/status',{signal:abort.signal}).then(r=>r.ok?r.json():{}).then((data:any)=>{natural.current=data.ttsProvider==='gemini';}).catch(()=>{});return()=>abort.abort();},[]);
  useEffect(() => () => {stop();void audio.current?.close();},[]);
  useEffect(() => {if(muted)stop();},[muted]);
  async function speak(raw:string,language:AgentLanguage){
    stop();setError('');if(mute.current){done.current?.();return;}
    const text=speechText(raw);if(!text)return;
    const id=version.current;setSpeaking(true);
    const finished=()=>{if(id===version.current){clearTimeout(watchdog.current);utterance.current=null;setSpeaking(false);done.current?.();}};
    async function server(provider:'local'|'gemini'){
      const current=new AbortController();controller.current=current;const timer=setTimeout(()=>current.abort(),30000);
      let bytes:ArrayBuffer;try{bytes=await new ServerTextToSpeechProvider(provider).speak(text,language,current.signal);}finally{clearTimeout(timer);}
      if(id!==version.current)return;
      audio.current ??= new AudioContext();await audio.current.resume();
      const buffer=await audio.current.decodeAudioData(bytes);if(id!==version.current)return;
      source.current=audio.current.createBufferSource();source.current.buffer=buffer;source.current.connect(audio.current.destination);source.current.onended=finished;source.current.start();
    }
    const fail=()=>{if(id===version.current){setSpeaking(false);setError('Could not play spoken reply. Tap replay to try again.');}};
    async function localFallback(){if(id!==version.current)return;try{await server('local');}catch{fail();}}
    if(natural.current){try{await server('gemini');return;}catch{if(id!==version.current)return;}}
    const native=selectSpeechVoice(await loadVoices(),agentLanguages[language].locale);if(id!==version.current)return;
    if(!native || !window.SpeechSynthesisUtterance){await localFallback();return;}
    const chunks=splitSpeech(text);let index=0,fellBack=false;
    const fallback=()=>{if(fellBack || id!==version.current)return;fellBack=true;clearTimeout(watchdog.current);window.speechSynthesis.cancel();void localFallback();};
    const next=()=>{
      if(id!==version.current || fellBack)return;
      if(index>=chunks.length){finished();return;}
      const part=new SpeechSynthesisUtterance(chunks[index++]);utterance.current=part;part.voice=native;part.lang=native.lang;part.rate=0.95;part.pitch=1;part.volume=1;
      part.onend=()=>{clearTimeout(watchdog.current);next();};part.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))fallback();};
      // Bound browsers that never dispatch onend on long utterances.
      watchdog.current=setTimeout(fallback,Math.max(12000,part.text.length*180));
      window.speechSynthesis.speak(part);
    };
    next();
  }
  return {speaking,muted,setMuted,error,unlock,stop,speak};
}
