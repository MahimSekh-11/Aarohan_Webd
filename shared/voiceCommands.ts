export const speechLocales = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN' } as const;
export type VoiceLanguage = keyof typeof speechLocales;
export type VoiceIntent = { action: 'search_product' | 'navigate' | 'create_product' | 'confirm' | 'cancel' | 'help' | 'unknown'; message: string; data?: Record<string, any> };
const commands = {
  search: /\b(find|search|show|looking for|buy)\b|खोजो|खोजें|ढूंढो|दिखाओ|खरीदना|খুঁজুন|খুঁজে|খোঁজো|দেখাও|দেখান|কিনতে|தேடு|காட்டு|வாங்க|వెతుకు|చూపించు|కొనాలి|शोधा|दाखवा|खरेदी|શોધો|બતાવો|ખરીદવું/iu,
  add: /\b(add|create|new product)\b|जोड़ो|जोड़ें|जोड़ना|নতুন পণ্য|যোগ করো|যোগ করুন|சேர்|சேர்க்க|జోడించు|జోడించండి|जोडा|जोडणे|ઉમેરો/iu,
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
export function parseNativeCommand(input: string, role?: string): VoiceIntent {
  const text = normalizeDigits(input.trim());
  if (commands.confirm.test(text)) return { action: 'confirm', message: 'Confirm' };
  if (commands.cancel.test(text)) return { action: 'cancel', message: 'Cancelled' };
  if (commands.help.test(text)) return { action: 'help', message: 'Ask me to search products, open your dashboard or requests, or add a product.' };
  if (commands.add.test(text)) {
    if (role !== 'manager') return { action: 'unknown', message: 'Only store managers can add products.' };
    const priceMatch = text.match(/(?:₹|\b(?:for|rs\.?|rupees|price)\b|कीमत|दाम|দাম|விலை|ధర|किंमत|કિંમત)\s*[:=]?\s*(\d+(?:\.\d+)?)/iu)
      || text.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs\b|रुपये|रुपया|টাকা|রুপি|ரூபாய்|రూపాయలు|રૂપિયા)/iu);
    const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?|pcs|units?|packets?|किलो|কেজি|கிலோ|కిలో|કિલો)/iu);
    const name = text.replace(commands.add, '').replace(priceMatch?.[0] || /$^/, '').replace(quantityMatch?.[0] || /$^/, '')
      .replace(/\b(of|product|please|at)\b|পণ্য|उत्पाद|தயாரிப்பு|ఉత్పత్తి|ઉત્પાદન/giu, '').replace(/[,।]+/g, ' ').trim();
    const price = Number(priceMatch?.[1]);
    const quantity = Number(quantityMatch?.[1] || 1);
    if (!name || !priceMatch || !Number.isFinite(price) || price <= 0 || quantity <= 0) return { action: 'unknown', message: 'Please include a product name and a positive price, for example: add rice for 200 rupees.' };
    return { action: 'create_product', message: 'Review this product, then confirm to save it.', data: { name, description: name, price, actualPrice: price, quantity, category: 'Groceries', deliveryAvailable: false, images: [] } };
  }
  if (commands.requests.test(text)) return { action: 'navigate', message: 'Opening requests', data: { path: role === 'manager' ? '/manager?view=leads' : '/customer?tab=requests' } };
  if (commands.dashboard.test(text)) return { action: 'navigate', message: 'Opening dashboard', data: { path: role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/customer' } };
  if (commands.marketplace.test(text) && !commands.search.test(text)) return { action: 'navigate', message: 'Opening marketplace', data: { path: '/marketplace' } };
  if (commands.home.test(text)) return { action: 'navigate', message: 'Opening home', data: { path: '/' } };
  if (commands.search.test(text)) {
    const search = text.replace(commands.search, '').replace(/\b(for|me|some|please|products?)\b/giu, '').replace(/দাও|দিন|করুন|করো|करो|करें|मुझे|পণ্য|தயவுசெய்து/gu, '').trim();
    if (search) return { action: 'search_product', message: 'Searching products', data: { search } };
  }
  return { action: 'unknown', message: 'I did not understand. Try searching for a product or ask for help.' };
}
