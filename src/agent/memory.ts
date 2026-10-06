import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { agentLanguages, type AgentLanguage } from '../../shared/agentLanguages';
export type Memories={language?:AgentLanguage;budget?:number;category?:string};
export interface MemoryProvider { read():Memories; remember(key:keyof Memories,value:string|number):void; forget(key:keyof Memories):void }
const categories=['Groceries','Handicrafts','Electronics','Clothing','Hardware'];
export function validateMemory(key:keyof Memories,value:unknown):boolean {
  if(key==='language')return typeof value==='string' && Object.hasOwn(agentLanguages,value);
  if(key==='budget')return typeof value==='number' && Number.isFinite(value) && value>0 && value<=1000000;
  if(key==='category')return typeof value==='string' && categories.includes(value);
  return false;
}
export const useAgentMemory=create<Memories & {enabled:boolean;setEnabled:(value:boolean) => void;remember:(key:keyof Memories,value:unknown) => boolean;forget:(key?:keyof Memories) => void}>()(persist((set,get) => ({
  enabled:true,setEnabled:enabled => set({enabled}),
  remember:(key,value) => {if(!get().enabled || !validateMemory(key,value))return false;set({[key]:value});return true;},
  forget:key => {if(key)set({[key]:undefined});else set({language:undefined,budget:undefined,category:undefined});},
}),{name:'aarohan-agent-preferences',partialize:state => ({enabled:state.enabled,language:state.language,budget:state.budget,category:state.category}),merge:(saved:any,current) => ({...current,enabled:typeof saved?.enabled==='boolean' ? saved.enabled : true,...Object.fromEntries(['language','budget','category'].filter(key => validateMemory(key as keyof Memories,saved?.[key])).map(key => [key,saved[key]]))})}));

export const localMemoryProvider:MemoryProvider={read:()=>{const {enabled,language,budget,category}=useAgentMemory.getState();return enabled?{language,budget,category}:{};},remember:(key,value)=>{useAgentMemory.getState().remember(key,value);},forget:key=>useAgentMemory.getState().forget(key)};
