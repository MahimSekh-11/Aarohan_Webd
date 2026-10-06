import { productTerms } from './languages.js';
import { productNameExtras } from './productVocabulary.js';
export const productNameLanguages=['en','hi','bn','ta','te','mr','gu'] as const;
export function translateKnownProductName(name:string,language:string):{text:string;complete:boolean}{
  const index=productNameLanguages.indexOf(language as any);if(index<0 || !name)return {text:name,complete:false};
  const terms=[...productTerms,...productNameExtras].flatMap(row=>row.map(term=>({term,value:row[index]}))).sort((a,b)=>b.term.length-a.term.length);
  const byTerm=new Map(terms.map(term=>[term.term.toLocaleLowerCase(),term.value]));
  const pattern=new RegExp(`(?<![\\p{L}\\p{N}\\p{M}])(?:${[...byTerm.keys()].map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})(?![\\p{L}\\p{N}\\p{M}])`,'giu');
  const unmatched=name.replace(pattern,'');
  const translated=name.replace(pattern,term=>byTerm.get(term.toLocaleLowerCase()) || term);
  return {text:translated,complete:!/[\p{L}]/u.test(unmatched)};
}
