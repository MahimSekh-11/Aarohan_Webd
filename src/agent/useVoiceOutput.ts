import { useEffect, useRef, useState } from 'react';
import { agentLanguages, type AgentLanguage } from '../../shared/agentLanguages';
export interface TextToSpeechProvider { speak(text:string, language:AgentLanguage, signal:AbortSignal):Promise<ArrayBuffer> }
export class ServerTextToSpeechProvider implements TextToSpeechProvider {
  async speak(text:string,language:AgentLanguage,signal:AbortSignal){
    const response=await fetch('/api/ai/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,1000),language:agentLanguages[language].base}),signal});
    if(!response.ok)throw new Error('Could not play spoken reply. Tap replay to try again.');
    return response.arrayBuffer();
  }
}
export function useVoiceOutput(onFinished?:() => void) {
  const [speaking,setSpeaking]=useState(false),[muted,setMuted]=useState(false),[error,setError]=useState('');
  const audio=useRef<AudioContext>(null), source=useRef<AudioBufferSourceNode>(null),version=useRef(0),controller=useRef<AbortController>(null),done=useRef(onFinished),mute=useRef(muted);done.current=onFinished;mute.current=muted;
  function unlock(){try{audio.current ??= new AudioContext();void audio.current.resume().catch(()=>{});}catch{setError('Could not play spoken reply. Tap replay to try again.');}}
  function stop(){version.current++;controller.current?.abort();source.current?.stop();source.current=null;window.speechSynthesis?.cancel();setSpeaking(false);}
  useEffect(() => () => {stop();void audio.current?.close();},[]);
  useEffect(() => {if(muted)stop();},[muted]);
  async function speak(text:string,language:AgentLanguage,serverOnly=false){
    stop();setError('');if(mute.current){done.current?.();return;}
    const id=version.current;setSpeaking(true);
    const finished=() => {if(id===version.current){setSpeaking(false);done.current?.();}};
    const native=window.speechSynthesis?.getVoices().find(v => v.lang.split('-')[0]===agentLanguages[language].base);
    if(native && !serverOnly){
      const utterance=new SpeechSynthesisUtterance(text);utterance.voice=native;utterance.lang=agentLanguages[language].locale;
      utterance.onend=finished;utterance.onerror=event => {if(id===version.current && !['canceled','interrupted'].includes(event.error))void speak(text,language,true);};window.speechSynthesis.speak(utterance);return;
    }
    try {
      controller.current=new AbortController();const current=controller.current;const timer=setTimeout(()=>current.abort(),20000);
      let bytes:ArrayBuffer;try{bytes=await new ServerTextToSpeechProvider().speak(text,language,current.signal);}finally{clearTimeout(timer);}
      if(id!==version.current)return;unlock();const buffer=await audio.current!.decodeAudioData(bytes);if(id!==version.current)return;
      source.current=audio.current!.createBufferSource();source.current.buffer=buffer;source.current.connect(audio.current!.destination);source.current.onended=finished;source.current.start();
    } catch(e){if(id===version.current){setSpeaking(false);setError('Could not play spoken reply. Tap replay to try again.');}}
  }
  return {speaking,muted,setMuted,error,unlock,stop,speak};
}
