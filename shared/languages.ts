export function detectTextLanguage(text: string): string {
  if (/[\u0980-\u09ff]/u.test(text)) return 'bn';
  if (/[\u0b80-\u0bff]/u.test(text)) return 'ta';
  if (/[\u0c00-\u0c7f]/u.test(text)) return 'te';
  if (/[\u0a80-\u0aff]/u.test(text)) return 'gu';
  if (/[\u0900-\u097f]/u.test(text)) return 'hi';
  return 'en';
}

export const productTerms = [
  ['rice','चावल','চাল','அரிசி','బియ్యం','तांदूळ','ચોખા'],
  ['wheat','गेहूं','গম','கோதுமை','గోధుమ','गहू','ઘઉં'],
  ['milk','दूध','দুধ','பால்','పాలు','दूध','દૂધ'],
  ['honey','शहद','মধু','தேன்','తేనె','मध','મધ'],
  ['potato','आलू','আলু','உருளைக்கிழங்கு','బంగాళాదుంప','बटाटा','બટાકા'],
  ['onion','प्याज','পেঁয়াজ','வெங்காயம்','ఉల్లిపాయ','कांदा','ડુંગળી'],
  ['tomato','टमाटर','টমেটো','தக்காளி','టమాటా','टोमॅटो','ટામેટા'],
  ['banana','केला','কলা','வாழைப்பழம்','అరటిపండు','केळी','કેળા'],
  ['mango','आम','আম','மாம்பழம்','మామిడి','आंबा','કેરી'],
  ['apple','सेब','আপেল','ஆப்பிள்','ఆపిల్','सफरचंद','સફરજન'],
  ['oil','तेल','তেল','எண்ணெய்','నూనె','तेल','તેલ'],
  ['fish','मछली','মাছ','மீன்','చేప','मासा','માછલી'],
  ['vegetables','सब्जियां','সবজি','காய்கறிகள்','కూరగాయలు','भाज्या','શાકભાજી'],
  ['fruit','फल','ফল','பழம்','పండు','फळ','ફળ'],
];
export function expandProductSearch(search: string): string[] {
  const normalized = search.trim().toLocaleLowerCase();
  const row = productTerms.find(terms => terms.some(term => term === normalized));
  return [...new Set(row ? [search, ...row] : [search])];
}
