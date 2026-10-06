import { useEffect, useRef, useState } from 'react';
import { startPcmRecording } from '../lib/audio';
import { agentLanguages, type AgentLanguage } from '../../shared/agentLanguages';

export interface SpeechToTextProvider { transcribe(audio:Blob, language:AgentLanguage, signal:AbortSignal):Promise<{text:string;language?:AgentLanguage}> }
export class ServerSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe(audio:Blob,language:AgentLanguage,signal:AbortSignal) {
    const form=new FormData(); form.append('audio',audio,'recording.wav');form.append('language',language);
    const response=await fetch('/api/ai/transcribe-and-intent',{method:'POST',body:form,signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.message || 'Speech service unavailable. You can type your command.');
    if(typeof data.transcript!=='string' || !data.transcript.trim())throw new Error('No speech detected. Please try again.');
    return {text:data.transcript,language:Object.hasOwn(agentLanguages,data.language)?data.language:undefined};
  }
}

export function useVoiceInput(language:AgentLanguage,onText:(text:string,confident:boolean,detectedLanguage?:AgentLanguage) => void,onError:(message:string) => void) {
  const [listening,setListening]=useState(false), [processing,setProcessing]=useState(false),[transcript,setTranscript]=useState('');
  const capture=useRef<Awaited<ReturnType<typeof startPcmRecording>> | null>(null),recognition=useRef<any>(null),version=useRef(0),active=useRef(false),timer=useRef<ReturnType<typeof setTimeout>>(null),controller=useRef<AbortController>(null);
  const callbacks=useRef({onText,onError}); callbacks.current={onText,onError};
  function cancel() {
    version.current++;active.current=false;recognition.current?.abort();recognition.current=null;
    capture.current?.cancel();capture.current=null;controller.current?.abort();clearTimeout(timer.current);setListening(false);setProcessing(false);
  }
  useEffect(() => {cancel();setTranscript('');return cancel;},[language]);
  async function finish(id:number) {
    const recording=capture.current;capture.current=null;if(!recording)return;
    recognition.current?.abort();recognition.current=null;clearTimeout(timer.current);setListening(false);setProcessing(true);
    try {
      const audio=await recording.stop();controller.current=new AbortController();
      timer.current=setTimeout(() => controller.current?.abort(),180000);
      const value=await new ServerSpeechToTextProvider().transcribe(audio,language,controller.current.signal);
      if(id===version.current){setTranscript(value.text);active.current=false;setProcessing(false);callbacks.current.onText(value.text,true,value.language);}
    } catch(error) {if(id===version.current)callbacks.current.onError((error as Error).name==='AbortError' ? 'Speech recognition timed out. Please try again.' : (error as Error).message);}
    finally {if(id===version.current){clearTimeout(timer.current);active.current=false;setProcessing(false);}}
  }
  async function start(serverOnly=false) {
    if(active.current)return;active.current=true;const id=++version.current;setTranscript('');
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone requires a supported browser and HTTPS.');
      const recording=await startPcmRecording(() => {if(id===version.current){if(recognition.current)recognition.current.stop();else void finish(id);}});
      if(id!==version.current){recording.cancel();return;} capture.current=recording;setListening(true);
      const Constructor=(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if(!Constructor || serverOnly || language==='auto'){timer.current=setTimeout(() => void finish(id),30000);return;}
      const instance=new Constructor();recognition.current=instance;instance.lang=agentLanguages[language].locale;instance.continuous=false;instance.interimResults=true;
      let text='', failed=false,confident=true;
      instance.onresult=(event:any) => {
        let interim='';for(let i=event.resultIndex;i<event.results.length;i++) {
          if(event.results[i].isFinal){text+=' '+event.results[i][0].transcript;if(event.results[i][0].confidence<0.7)confident=false;}
          else interim+=event.results[i][0].transcript;
        }
        if(id===version.current)setTranscript((text || interim).trim());
      };
      instance.onerror=() => {failed=true;if(id===version.current)recognition.current=null;};
      instance.onend=() => {
        if(id!==version.current || !active.current)return;recognition.current=null;clearTimeout(timer.current);
        if(!failed && text.trim()) {capture.current?.cancel();capture.current=null;active.current=false;setListening(false);callbacks.current.onText(text.trim(),confident);}
        else if(!failed)void finish(id);
        else timer.current=setTimeout(() => void finish(id),30000);
      };
      try {instance.start();timer.current=setTimeout(() => instance.stop(),30000);}
      catch {recognition.current=null;timer.current=setTimeout(() => void finish(id),30000);}
    } catch(error) {
      active.current=false;setListening(false);
      callbacks.current.onError((error as Error).name==='NotAllowedError' ? 'Microphone permission denied. Allow microphone access in your browser.' : (error as Error).message);
    }
  }
  function stop(){if(recognition.current)recognition.current.stop();else void finish(version.current);}
  return {listening,processing,transcript,start,stop,cancel};
}
