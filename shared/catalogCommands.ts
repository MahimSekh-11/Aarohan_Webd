export const categoryNames=[
  ['Groceries','grocery','groceries','মুদিখানা','মুদি','किराना','மளிகை','కిరాణా','किराणा','કરિયાણા'],
  ['Handicrafts','handicraft','handicrafts','হস্তশিল্প','हस्तशिल्प','கைவினை','హస్తకళలు','हस्तकला','હસ્તકલા'],
  ['Electronics','electronics','electronic','ইলেকট্রনিক্স','इलेक्ट्रॉनिक्स','மின்னணு','ఎలక్ట్రానిక్స్','ઇલેક્ટ્રોનિક્સ'],
  ['Clothing','clothes','clothing','পোশাক','कपड़े','ஆடை','దుస్తులు','कपडे','કપડાં'],
  ['Hardware','hardware','হার্ডওয়্যার','हार्डवेयर','வன்பொருள்','హార్డ్‌వేర్','હાર્ડવેર'],
];
export const normalizeCategory=(value:string)=>categoryNames.find(row=>row.some(term=>term.toLocaleLowerCase()===value.trim().toLocaleLowerCase()))?.[0] || value.trim();
const boundary=String.raw`(?=\s+(?:and\s+)?(?:from|in|near|at|store name|shop name|location|category|price|under|below|above|over|between|delivery|sort|দোকান|লোকেশন|স্থান|বিভাগ|শ্রেণি|দাম|মধ্যে|ডেলিভারি|दुकान|स्थान|श्रेणी|कीमत)(?:\s|[:=]|$)|[,;]|$)`;
// Unicode words do not use JS \b; explicitly separate native clause labels.
const nativeBoundary=String.raw`(?=\s+(?:দোকান|লোকেশন|স্থান|বিভাগ|শ্রেণি|দাম|ডেলিভারি|दुकान|स्थान|श्रेणी|कीमत)|$)`;
export function extractCatalogFilters(input:string,previous:Record<string,unknown>={}){
  if(/\b(?:clear|reset|remove)\s+(?:all\s+)?filters?\b|সব ফিল্টার মুছে|ফিল্টার রিসেট|फ़िल्टर हटाओ|ফিল্টার মুছ/iu.test(input))return {text:'',filters:{sort:'newest'},reset:true};
  let text=input.replace(/\b(?:in|on|from)\s+(?:the\s+)?market(?:place)?\b/giu,'');
  const filters:Record<string,unknown>={...previous};
  const amount=String.raw`(?:₹\s*|rs\.?\s*)?(\d+(?:\.\d+)?)`;
  const range=text.match(new RegExp(String.raw`(?:between|price from|দাম|মূল্য|कीमत)\s*${amount}\s*(?:and|to|থেকে|से|-)\s*${amount}`,'iu')) || text.match(/(\d+(?:\.\d+)?)\s*(?:থেকে|से)\s*(\d+(?:\.\d+)?)\s*(?:টাকা|रुपये)/iu);
  if(range){filters.minPrice=Number(range[1]);filters.maxPrice=Number(range[2]);text=text.replace(range[0],'');}
  const min=text.match(new RegExp(String.raw`(?:above|over|at least|minimum(?: price)?|min(?: price)?|বেশি|উপরে|न्यूनतम|से अधिक)\s*${amount}`,'iu')) || text.match(/(\d+(?:\.\d+)?)\s*(?:টাকার?\s*(?:বেশি|উপরে)|रुपये से अधिक)/iu);
  if(min){filters.minPrice=Number(min[1]);text=text.replace(min[0],'');}
  const max=text.match(new RegExp(String.raw`(?:under|below|less than|cheaper than|within|around|maximum(?: price)?|max(?: price)?|মধ্যে|মধ্য়ে|কম|নিচে|modhye|के अंदर|नीचे|कम|கீழ்|లోపు|पेक्षा कमी|ઓછા)\s*${amount}`,'iu')) || text.match(/(\d+(?:\.\d+)?)\s*(?:takar?\s+modhye|টাকার?\s*(?:মধ্যে|কম|নিচে)|রুপির\s*মধ্যে|रुपये\s*(?:से कम|के अंदर))/iu);
  if(max){filters.maxPrice=Number(max[1]);text=text.replace(max[0],'');}
  for(const [key,label]of [['category',String.raw`\bcategory\b|বিভাগ|শ্রেণি|श्रेणी|वर्ग|வகை|వర్గం|શ્રેણી`],['storeName',String.raw`\b(?:from (?:the )?(?:store |shop )?|store(?: name)?|shop)\b|দোকান(?:ের নাম)?|স্টোর(?: নাম)?|दुकान(?: का नाम)?`],['location',String.raw`\b(?:location|located in|near|in)\b|লোকেশন|স্থান|জায়গা|स्थान`]] as const){
    const match=text.match(new RegExp(String.raw`(?:${label})\s*(?:is\s+|to\s+|by\s+|[:=]\s*)?(?:"([^"]+)"|'([^']+)'|(.+?)${boundary})`,'iu')) || text.match(new RegExp(String.raw`(?:${label})\s+(.+?)${nativeBoundary}`,'iu'));
    if(match){const value=(match[1] || match[2] || match[3] || '').replace(/\s+(?:please|products?|items?|দেখাও|দেখান|খুঁজুন|दिखाओ|दिखाएं)$/iu,'').trim();if(value)filters[key]=key==='category'?normalizeCategory(value):value;text=text.replace(match[0],'');}
  }
  const delivery=text.match(/\b(?:no delivery|without delivery|delivery (?:no|false)|delivery(?: only| available| yes| true)?)\b|ডেলিভারি(?: নেই| না| আছে)?|डिलीवरी(?: नहीं)?/iu);
  if(delivery){filters.deliveryAvailable=!/\b(no|without|false)\b|নেই|না|नहीं/iu.test(delivery[0]);text=text.replace(delivery[0],'');}
  for(const row of categoryNames){for(const term of row.slice(1)){const regex=new RegExp(`(?<![\\p{L}\\p{N}])${term}(?![\\p{L}\\p{N}])`,'iu');if(regex.test(text)){filters.category=row[0];text=text.replace(regex,'');break;}}}
  return {text,filters,reset:false};
}

export function pageNavigation(text:string,role?:string):string|undefined{
  if(/^(?:help|voice help|voice commands|show help|open help|सहायता|সাহায্য)[.!\s]*$/iu.test(text))return '/help';
  if(!/\b(?:open|go|move|navigate|visit|switch|take me)\b|যাও|খোল|खोल|जाओ|செல்|తెరువు|उघड|ખોલો/iu.test(text))return;
  if(/\b(?:home|homepage)\b|হোম|मुख्य पृष्ठ|முகப்பு|హోమ్|મુખ્ય પૃષ્ઠ/iu.test(text))return '/';
  if(/\b(?:add (?:item|product)|new (?:item|product))\b|পণ্য যোগ|নতুন পণ্য|उत्पाद जोड़/iu.test(text))return '/manager?view=add';
  if(/\b(?:marketplace|market|products page|product page|catalog)\b|বাজার|बाज़ार|बाजार|சந்தை|మార్కెట్|બજાર/iu.test(text))return '/marketplace';
  if(/\b(?:inventory|my store)\b|আমার দোকান|मेरा स्टोर|என் கடை|నా దుకాణం|મારી દુકાન/iu.test(text))return '/manager';
  if(/\b(?:requests?|orders?|leads|inquiries)\b|অনুরোধ|অর্ডার|अनुरोध|ऑर्डर/iu.test(text))return role==='manager'?'/manager?view=leads':'/customer?tab=requests';
  if(/\b(?:account|profile|settings)\b|প্রোফাইল|खाता/iu.test(text))return '/account';
  if(/\b(?:dashboard|admin page)\b|ড্যাশবোর্ড|डैशबोर्ड/iu.test(text))return role==='admin'?'/admin':role==='manager'?'/manager':'/customer';
  if(/\b(?:register|sign up|signup)\b|নিবন্ধন|पंजीकरण/iu.test(text))return '/register';
  if(/\b(?:login|log in|sign in)\b|লগইন|लॉगिन/iu.test(text))return /\badmin\b/i.test(text)?'/admin/login':'/login';
}
