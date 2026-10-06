import { productTerms } from './languages.js';
import { extractProduct, productComplete } from './productVoice.js';
export const speechLocales = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN' } as const;
export type VoiceLanguage = keyof typeof speechLocales;
export type VoiceIntent = { action: 'search_product' | 'navigate' | 'website_control' | 'create_product' | 'confirm' | 'cancel' | 'help' | 'unknown'; message: string; data?: Record<string, any> };
const commands = {
  search: /\b(find|search|show|looking for|buy|want)\b|खोजो|खोजें|ढूंढो|दिखाओ|खरीदना|খোঁজো|খোঁজ|সার্চ|খুঁজুন|খুঁজে|দেখাও|দেখান|কিনতে|চাই|தேடு|காட்டு|வாங்க|వెతుకు|చూపించు|కొనాలి|शोधा|दाखवा|खरेदी|શોધો|બતાવો|ખરીદવું/iu,
  add: /\b(add|create|new product)\b|जोड़ दीजिए|जोड़ो|जोड़ें|जोड़ना|নতুন পণ্য|অ্যাড|এড|যোগ করো|যোগ করুন|சேர்|சேர்க்க|జోడించు|జోడించండి|जोडा|जोडणे|ઉમેરો/iu,
  confirm: /^(yes|confirm|save|हाँ|हां|पुष्टि|হ্যাঁ|নিশ্চিত|ஆம்|சரி|అవును|होय|હા)[.!।\s]*$/iu,
  cancel: /^(no|cancel|stop|नहीं|रद्द|না|বাতিল|இல்லை|ரத்து|కాదు|రద్దు|नाही|રદ|ના)[.!।\s]*$/iu,
  help: /\b(help|what can you do)\b|मदद|सहायता|সাহায্য|உதவி|సహాయం|મદદ/iu,
  requests: /\b(requests?|orders?|inquiries)\b|अनुरोध|ऑर्डर|অনুরোধ|অর্ডার|கோரிக்கை|ఆర్డర్|विनंती|ઓર્ડર|વિનંતી/iu,
  dashboard: /\b(dashboard|inventory|my store)\b|डैशबोर्ड|मेरा स्टोर|আমার দোকান|ড্যাশবোর্ড|என் கடை|నా దుకాణం|माझे दुकान|મારી દુકાન/iu,
  marketplace: /\b(marketplace|market)\b|बाज़ार|बाजार|বাজার|சந்தை|మార్కెట్|બજાર/iu,
  home: /\b(home|homepage)\b|होम|मुख्य पृष्ठ|হোম|முகப்பு|హోమ్|મુખ્ય પૃષ્ઠ/iu,
};
export function normalizeDigits(text: string) {
  return text.replace(/[०-९০-৯௦-௯౦-౯૦-૯]/g, value => {
    const point = value.charCodeAt(0);
    for (const start of [0x966, 0x9e6, 0xbe6, 0xc66, 0xae6]) if (point >= start && point <= start + 9) return String(point - start);
    return value;
  });
}
export function parseNativeCommand(input: string, role?: string, previous?: Record<string,any> | null): VoiceIntent {
  const text = normalizeDigits(input.trim());
  if (commands.confirm.test(text)) return { action: 'confirm', message: 'Confirm' };
  if (commands.cancel.test(text)) return { action: 'cancel', message: 'Cancelled' };
  if (/\b(scroll down|go down)\b|नीचे|নিচে|கீழே|కింద|खाली|નીચે/iu.test(text)) return { action:'website_control', message:'Scrolling down', data:{ command:'scroll_down' } };
  if (/\b(scroll up|go up)\b|ऊपर|উপরে|மேலே|పైకి|वरती|ઉપર/iu.test(text)) return { action:'website_control', message:'Scrolling up', data:{ command:'scroll_up' } };
  if (/\b(go back|previous page)\b|वापस|ফিরে যাও|আগের পৃষ্ঠা|திரும்பு|వెనక్కి|मागे|પાછા/iu.test(text)) return { action:'website_control', message:'Going back', data:{ command:'back' } };
  if (/\b(read page|read this|read aloud)\b|पढ़ो|পড়ে শোনাও|পড়ে শোনাও|வாசி|చదువు|वाचा|વાંચો/iu.test(text)) return { action:'website_control', message:'Reading this page', data:{ command:'read' } };
  if (/\b(log ?in|sign in)\b|लॉगिन|লগইন|உள்நுழை|లాగిన్|લૉગિન/iu.test(text)) return { action:'navigate', message:'Opening login', data:{ path:'/login' } };
  if (/\b(sign ?up|register)\b|पंजीकरण|নিবন্ধন|பதிவு|నమోదు|नोंदणी|નોંધણી/iu.test(text)) return { action:'navigate', message:'Opening registration', data:{ path:'/register' } };
  if (!commands.add.test(text) && !previous && /\b(delivery only|home delivery)\b|डिलीवरी|ডেলিভারি|விநியோகம்|డెలివరీ|વિતરણ/iu.test(text)) return { action:'navigate', message:'Showing products with delivery', data:{ path:'/marketplace?delivery=true' } };
  if (commands.help.test(text)) return { action: 'help', message: 'Ask me to search products, open your dashboard or requests, or add a product.' };
  if (commands.add.test(text) || (previous && !commands.search.test(text) && !commands.dashboard.test(text) && !commands.marketplace.test(text) && !commands.home.test(text))) {
    if (role !== 'manager') return { action:'unknown', message:'Only store managers can add products.' };
    const product = extractProduct(text,commands.add,previous);
    return { action:'create_product', data:product, message:!product.name ? 'What is the product name?' : !Number.isFinite(product.price) || product.price <= 0 ? 'What is the price? Say a positive amount.' : !productComplete(product) ? 'What is the quantity? Say a positive amount.' : 'Review this product, then confirm to save it.' };
  }
  if (commands.requests.test(text)) return { action: 'navigate', message: 'Opening requests', data: { path: role === 'manager' ? '/manager?view=leads' : '/customer?tab=requests' } };
  if (commands.dashboard.test(text)) return { action: 'navigate', message: 'Opening dashboard', data: { path: role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/customer' } };
  const mentioned = productTerms.flat().find(term => {
    const lower = text.toLocaleLowerCase();
    if (/^[a-z]+$/i.test(term)) return new RegExp(`\\b${term}\\b`,'i').test(lower);
    return lower === term;
  });
  if (mentioned && !commands.search.test(text)) return { action:'search_product', message:'Searching products', data:{search:mentioned} };
  if (commands.marketplace.test(text) && !commands.search.test(text)) return { action: 'navigate', message: 'Opening marketplace', data: { path: '/marketplace' } };
  if (commands.home.test(text)) return { action: 'navigate', message: 'Opening home', data: { path: '/' } };
  if (commands.search.test(text)) {
    const search = text.replace(commands.search, '').replace(/\b(?:in|on|from)\s+(?:the\s+)?market(?:place)?\b/giu,'').replace(/\b(for|me|some|please|products?|i|to)\b/giu, '').replace(/আমাকে|আমি|একটা|কিছু|দাও|দিন|করুন|করো|চাই|खरीदना|करो|करें|मुझे|পণ্য|தயவுசெய்து/gu, '').replace(/[.!।]+$/u,'').replace(/\s+/g,' ').trim();
    if (search) return { action: 'search_product', message: 'Searching products', data: { search } };
  }
  return { action: 'unknown', message: 'I did not understand. Try searching for a product or ask for help.' };
}
