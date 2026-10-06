export function speechText(text:string){
  return text.normalize('NFC').replace(/https?:\/\/\S+/g,'').replace(/[*_`#<>]/g,'').replace(/\s+/g,' ').trim().slice(0,1000);
}
export function splitSpeech(text:string,max=180):string[]{
  const chunks:string[]=[];let current='';
  for(const word of text.split(/\s+/)){
    if(current && (current.length+word.length>max || /[.!?।]$/.test(current))){chunks.push(current);current='';}
    current+=(current?' ':'')+word;
  }
  if(current)chunks.push(current);
  return chunks;
}
export function selectSpeechVoice<T extends {lang:string;name:string;localService?:boolean;default?:boolean}>(voices:T[],locale:string):T|undefined{
  const normalize=(lang:string)=>lang.toLowerCase().replace(/_/g,'-');
  const target=normalize(locale),base=target.split('-')[0];
  return voices.filter(v=>normalize(v.lang).split('-')[0]===base).sort((a,b)=>{
    const score=(v:T)=>(normalize(v.lang)===target?8:0)+(/natural|neural|google/i.test(v.name)?4:0)+(v.localService===false?2:0)+(v.default?1:0);
    return score(b)-score(a);
  })[0];
}
