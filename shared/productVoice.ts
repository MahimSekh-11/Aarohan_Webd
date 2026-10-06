// Spoken amounts are normalized before extracting product fields. Native digits
// are handled by normalizeDigits in voiceCommands.
import { normalizeCategory } from './catalogCommands.js';
const numberRows = [
  'zero|शून्य|শূন্য|பூஜ்யம்|సున్నా|શૂન્ય',
  'one|एक|এক|ஒன்று|ఒకటి|એક', 'two|दो|দুই|இரண்டு|రెండు|दोन|બે',
  'three|तीन|তিন|மூன்று|మూడు|ત્રણ', 'four|चार|চার|நான்கு|నాలుగు|ચાર',
  'five|पांच|पाँच|পাঁচ|ஐந்து|ఐదు|પાંચ', 'six|छह|ছः|ছয়|ছয়|ஆறு|ఆరు|सहा|છ',
  'seven|सात|সাত|ஏழு|ఏడు|સાત', 'eight|आठ|আট|எட்டு|ఎనిమిది|આઠ',
  'nine|नौ|নয়|নয়|ஒன்பது|తొమ్మిది|नऊ|નવ', 'ten|दस|দশ|பத்து|పది|दहा|દસ',
  'eleven|ग्यारह|এগারো', 'twelve|बारह|বারো', 'thirteen|तेरह|তেরো',
  'fourteen|चौदह|চৌদ্দ', 'fifteen|पंद्रह|পনেরো', 'sixteen|सोलह|ষোলো',
  'seventeen|सत्रह|সতেরো', 'eighteen|अठारह|আঠারো', 'nineteen|उन्नीस|উনিশ',
];
const numbers = new Map<string, number>();
numberRows.forEach((row, n) => row.split('|').forEach(word => numbers.set(word,n)));
['twenty|बीस|বিশ|இருபது|ఇరవై|वीस|વીસ','thirty|तीस|ত্রিশ|முப்பது|ముప్పై|ત્રીસ','forty|चालीस|চল্লিশ|நாற்பது|నలభై|ચાળીસ','fifty|पचास|পঞ্চাশ|ஐம்பது|యాభై|पन्नास|પચાસ','sixty|साठ|ষাট|அறுபது|అరవై|સાઠ','seventy|सत्तर|সত্তর|எழுபது|డెబ్బై|સિત્તેર','eighty|अस्सी|আশি|எண்பது|ఎనభై|ऐंशी|એંસી','ninety|नब्बे|নব্বই|தொண்ணூறு|తొంభై|नव्वद|નેવું'].forEach((row,i) => row.split('|').forEach(word => numbers.set(word,20+i*10)));
['একশো|একশ|শত|நூறு|వంద|शंभर|સો','দুইশো|দুশো','তিনশো','চারশো','পাঁচশো','ছয়শো','সাতশো','আটশো','নয়শো'].forEach((row,i) => row.split('|').forEach(word => numbers.set(word,(i+1)*100)));
const scales: Record<string,number> = { hundred:100, सौ:100, শো:100, ஆயிரம்:1000, వెయ్యి:1000, thousand:1000, हजार:1000, हज़ार:1000, হাজার:1000, હજાર:1000, lakh:100000, लाख:100000, লাখ:100000 };
export function normalizeSpokenNumbers(input: string) {
  const tokens = input.toLowerCase().replace(/([a-z])-([a-z])/g,'$1 $2').split(/\s+/);
  let output: string[] = [], total = 0, part = 0, active = false, digitSequence = '';
  const flush = () => { if (active) output.push(String(total+part)); total=0; part=0; active=false; digitSequence=''; };
  for (const token of tokens) {
    let word = token.replace(/[,!.।]$/u,'');
    const counted = word.replace(/(?:টি|টা)$/u,'');
    if (numbers.has(counted)) word = counted;
    if (numbers.has(word)) {
      const value = numbers.get(word)!;
      if (value < 10 && (digitSequence || !active)) { digitSequence += value; part=Number(digitSequence); }
      else { part += value; digitSequence=''; }
      active=true;
    }
    else if (scales[word]) {
      const scale = scales[word]; active=true; digitSequence='';
      if (scale === 100) part = (part || 1)*scale;
      else { total += (part || 1)*scale; part=0; }
    } else if (active && ['and','और','এবং'].includes(word)) continue;
    else { flush(); output.push(token); }
    if (/[,!.।]$/u.test(token) && active) { flush(); output.push(token.slice(-1)); }
  }
  flush(); return output.join(' ').replace(/(\d+)\s+(?:point|decimal|दशमलव|দশমিক)\s+(\d+)/gu,'$1.$2');
}
export function productComplete(product?: Record<string,any> | null) {
  return !!product?.name?.trim() && Number.isFinite(product.price) && product.price > 0 && Number.isInteger(product.quantity) && product.quantity > 0;
}
const pricePattern = /(?:₹|\b(?:for|at|rs\.?|rupees|price|priced|costs?)\b|कीमत|दाम|প্রাইস|মূল্য|দাম|விலை|ధర|किंमत|કિંમત)\s*(?:is|to|at|of|है|হলো|হবে|[:=])?\s*(\d+(?:\.\d+)?)(?:\s*(?:rupees|rs\b|रुपये|रुपया|টাকা|রুপি|ரூபாய்|రూపాయలు|રૂપિયા))?/iu;
const quantityPattern = /(?:\b(?:quantity|stock|units)\b|मात्रा|স্টক|সংখ্যা|পরিমাণ|মজুত|அளவு|పరిమాణం|प्रमाण|જથ્થો)\s*(?:is|to|হলো|হবে|[:=])?\s*(\d+(?:\.\d+)?)(?:\s*(?:kg|kilos?|kilograms?|pcs|units?|packets?|किलो|কেজি|கிலோ|కిలో|કિલો))?|(?:(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?|pcs|units?|packets?|किलो|কেজি|கிலோ|కిలో|કિલો))/iu;
export function extractProduct(text: string, add: RegExp, previous?: Record<string,any> | null) {
  const normalized = normalizeSpokenNumbers(text.replace(/(?:^|\s)(?:একটি|একটা)(?=\s|$)/gu,' ')).replace(/(?<=\d),(?=\d)/g,'');
  const product = { quantity:1, category:'Groceries', deliveryAvailable:false, images:[], ...previous } as Record<string,any>;
  const price = normalized.match(pricePattern) || normalized.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs\b|रुपये|रुपया|টাকা|রুপি|ரூபாய்|రూపాయలు|રૂપિયા)/iu);
  const quantity = normalized.match(quantityPattern);
  if (price) { product.price = Number(price[1]); product.actualPrice = product.price; }
  if (quantity) product.quantity = Number(quantity[1] || quantity[2]);
  const delivery = normalized.match(/(?:delivery|डिलीवरी|ডেলিভারি|விநியோகம்|డెలివరీ|વિતરણ)\s*(yes|available|true|no|false|हाँ|হ্যাঁ|না|নেই|হবে|అవును|ஆம்|હા)?/iu);
  if (delivery) product.deliveryAvailable = !/\b(no|false)\b|না|নেই/iu.test(delivery[0]);
  const description = normalized.match(/(?:description|विवरण|বিবরণ|விளக்கம்|వివరణ|વર્ણન)\s*[:=]?\s*(.+?)(?=,|\b(?:price|quantity|stock|category|delivery)\b|$)/iu);
  const category = normalized.match(/(?:category|श्रेणी|বিভাগ|வகை|వర్గం|શ્રેણી)\s*[:=]?\s*(.+?)(?=,|\b(?:price|quantity|stock|description|delivery)\b|$)/iu);
  if (description) product.description = description[1].trim();
  if (category) product.category = category[1].trim();
  let name = normalized.replace(new RegExp(add.source,add.flags.includes('g') ? add.flags : add.flags+'g'),'').replace(price?.[0] || /$^/,'').replace(quantity?.[0] || /$^/,'')
    .replace(delivery?.[0] || /$^/,'').replace(description?.[0] || /$^/,'').replace(category?.[0] || /$^/,'')
    .replace(/\b(i|want|would|like|to|with|new|a|an|of|product|item|please|called|named|name|is|at|rupees|change|set|update|units|kilograms|kg|pcs)\b|নতুন|পণ্যের নাম|নামে|নাম|প্রোডাক্ট|আইটেম|একটি|একটা|পণ্য|जोड़ दीजिए|उत्पाद|आइटम|தயாரிப்பு|உత్పత్తి|ઉત્પાદન/giu,'')
    .replace(/[,।.!:="“”]+/g,' ').replace(/\s+/g,' ').trim();
  // A bare amount answers the missing price question; it is never a name.
  if (/^\d+(?:\.\d+)?$/.test(name)) {
    if (!Number.isFinite(product.price) || product.price <= 0) { product.price=Number(name); product.actualPrice=product.price; }
    else if (!Number.isFinite(product.quantity) || product.quantity <= 0) product.quantity=Number(name);
    name='';
  }
  if (name) product.name = name;
  product.description ||= product.name;
  return product;
}
export function extractProductUpdates(input:string):Record<string,unknown>{
  const text=normalizeSpokenNumbers(input).replace(/\b(price|stock|quantity|discount|offer)\s+of\s+(.+?)\s+(?:to|is)\s+(\d+(?:\.\d+)?)/giu,'$1 to $3'),result:Record<string,unknown>={};
  const price=text.match(pricePattern),quantity=text.match(quantityPattern);
  if(price)result.price=Number(price[1]);if(quantity)result.quantity=Number(quantity[1] || quantity[2]);
  const offer=text.match(/(?:\boffer\b|\bdiscount\b|ছাড়|ছাড়|छूट)\s*(?:to|is|[:=])?\s*(\d+(?:\.\d+)?)/iu);if(offer)result.offer=Number(offer[1]);
  const stop=String.raw`(?=\s+(?:and\s+)?(?:price|quantity|stock|category|delivery|description|discount|offer|name)\b|\s+(?:দাম|সংখ্যা|স্টক|বিভাগ|ডেলিভারি|বিবরণ|নাম)|[,;]|$)`;
  for(const [field,label]of [['name',String.raw`\bname\b|নাম|नाम`],['description',String.raw`\bdescription\b|বিবরণ|विवरण|விளக்கம்|వివరణ|વર્ણન`],['category',String.raw`\bcategory\b|বিভাগ|শ্রেণি|श्रेणी|வகை|వర్గం|શ્રેણી`]] as const){
    const match=text.match(new RegExp(String.raw`(?:${label})\s*(?:to\s+|is\s+|হলো\s+|করো\s+|[:=]\s*)?(?:"([^"]+)"|'([^']+)'|(.+?)${stop})`,'iu'));
    if(match){const value=(match[1] || match[2] || match[3]).trim();if(value)result[field]=field==='category'?normalizeCategory(value):value;}
  }
  const delivery=text.match(/(?:\bdelivery\b|ডেলিভারি|डिलीवरी|விநியோகம்|డెలివరీ|વિતરણ)\s*(?:to|is|[:=])?\s*(yes|available|true|no|false|unavailable|हाँ|হ্যাঁ|না|নেই|হবে|অবশ্যই|नहीं|అవును|ஆம்|હા)/iu);
  if(delivery)result.deliveryAvailable=!/^(no|false|unavailable|না|নেই|नहीं)$/iu.test(delivery[1]);
  return result;
}
