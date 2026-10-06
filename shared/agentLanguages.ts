export const agentLanguages = {
  auto: { name:'Auto Detect', locale:'en-IN', base:'en' },
  en: { name:'English', locale:'en-IN', base:'en' },
  hi: { name:'हिंदी', locale:'hi-IN', base:'hi' },
  bn: { name:'বাংলা', locale:'bn-IN', base:'bn' },
  hinglish: { name:'Hinglish', locale:'hi-IN', base:'hi' },
  banglish: { name:'Banglish', locale:'bn-IN', base:'bn' },
  ta: { name:'தமிழ்', locale:'ta-IN', base:'ta' },
  te: { name:'తెలుగు', locale:'te-IN', base:'te' },
  mr: { name:'मराठी', locale:'mr-IN', base:'mr' },
  gu: { name:'ગુજરાતી', locale:'gu-IN', base:'gu' },
  kn: { name:'ಕನ್ನಡ', locale:'kn-IN', base:'kn' },
  ml: { name:'മലയാളം', locale:'ml-IN', base:'ml' },
  pa: { name:'ਪੰਜਾਬੀ', locale:'pa-IN', base:'pa' },
  ur: { name:'اردو', locale:'ur-PK', base:'ur' },
} as const;
export type AgentLanguage = keyof typeof agentLanguages;
export function detectAgentLanguage(text: string): Exclude<AgentLanguage,'auto'> {
  const scripts = [['bn',/[\u0980-\u09ff]/u],['ta',/[\u0b80-\u0bff]/u],['te',/[\u0c00-\u0c7f]/u],['gu',/[\u0a80-\u0aff]/u],['kn',/[\u0c80-\u0cff]/u],['ml',/[\u0d00-\u0d7f]/u],['pa',/[\u0a00-\u0a7f]/u],['ur',/[\u0600-\u06ff]/u],['hi',/[\u0900-\u097f]/u]] as const;
  if(/[\u0900-\u097f]/u.test(text) && /मला|माझ|आहे|पाहिजे|शोधा|तांदूळ|जोडा/u.test(text))return 'mr';
  for (const [lang,pattern] of scripts) if (pattern.test(text)) return lang;
  if (/\b(amar|amake|jonno|taka|khuje|khujun|dao|dekhao)\b/i.test(text)) return 'banglish';
  if (/\b(mujhe|chahiye|khojo|dikhao|rupaye|mere|karo)\b/i.test(text)) return 'hinglish';
  return 'en';
}
