import { agentLanguages } from './agentLanguages';
export type MemoryInstruction={action:'forget';key?:'language'|'budget'|'category'}|{action:'remember';key:'language'|'budget'|'category';value:string|number}|{action:'unsupported'};
const aliases:Record<string,string[]>={en:['english'],hi:['hindi'],bn:['bengali','bangla'],ta:['tamil'],te:['telugu'],mr:['marathi'],gu:['gujarati'],kn:['kannada'],ml:['malayalam'],pa:['punjabi'],ur:['urdu'],hinglish:['hinglish'],banglish:['banglish'],auto:['automatic']};
export function parseMemoryInstruction(text:string):MemoryInstruction|undefined{
  const language=Object.entries(agentLanguages).find(([key,entry])=>text.includes(entry.name) || new RegExp(`\\b(?:${key}|${aliases[key]?.join('|') || key})\\b`,'i').test(text))?.[0];
  const forget=/\b(forget|clear|remove)\b.*\b(memory|memories|preferences|prefer|budget|language|category|bengali|hindi|english|bangla)\b|স্মৃতি মুছে|याद भूल/iu.test(text);
  if(forget)return {action:'forget',key:language || /language|ভাষা|भाषा/iu.test(text)?'language':/budget|বাজেট|बजट/iu.test(text)?'budget':/category/iu.test(text)?'category':undefined};
  if(!/\bremember\b|মনে রাখ|মনে রেখ|याद रख/iu.test(text))return;
  const amount=text.match(/(?:under|budget|below|বাজেট|মধ্যে|बजट)\s*₹?\s*(\d+)/iu);
  if(amount)return {action:'remember',key:'budget',value:Number(amount[1])};
  if(language)return {action:'remember',key:'language',value:language};
  const category=['Groceries','Handicrafts','Electronics','Clothing','Hardware'].find(c=>new RegExp(`\\b${c}\\b`,'i').test(text));
  return category?{action:'remember',key:'category',value:category}:{action:'unsupported'};
}
