import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeSpeech, synthesizeNaturalSpeech } from '../backend/speechSynthesis.js';
import { speechText, splitSpeech, selectSpeechVoice } from '../src/agent/speechText';
import { convertAudioBuffer } from '../backend/aiService.js';
import { speechLocales, type VoiceLanguage, parseNativeCommand } from '../shared/voiceCommands';
import { t } from '../src/i18n/translations';

test('local synthesizer produces audible native WAV for every supported language', async () => {
  for (const lang of Object.keys(speechLocales) as VoiceLanguage[]) {
    const samplesByLanguage:Record<string,string>={kn:'ಮಾರುಕಟ್ಟೆ ತೆರೆಯುತ್ತಿದೆ',ml:'വിപണി തുറക്കുന്നു',pa:'ਬਾਜ਼ਾਰ ਖੋਲ੍ਹ ਰਿਹਾ ਹਾਂ',ur:'بازار کھول رہا ہوں'};
    const text = samplesByLanguage[lang] || t('Opening marketplace',lang as any);
    const wav = await synthesizeSpeech(text,lang);
    assert.equal(wav.toString('ascii',0,4),'RIFF');
    const samples = convertAudioBuffer(wav);
    assert.ok(samples.length > 16000, `${lang}: missing spoken audio`);
    assert.ok(samples.some(sample => Math.abs(sample) > 0.01), `${lang}: silent reply`);
    assert.ok(samples.length/16000 < 15, `${lang}: speech rate must be conversational, not the minimum rate`);
  }
});
test('native voice selection ranks locale and quality, and speech chunks retain complete words',()=>{
  const voices=[{lang:'en-US',name:'English'},{lang:'bn-BD',name:'Basic Bangla'},{lang:'bn-IN',name:'Basic Bangla India'},{lang:'bn-IN',name:'Google Bangla',localService:false}];
  assert.equal(selectSpeechVoice(voices,'bn-IN')?.name,'Google Bangla');assert.equal(selectSpeechVoice(voices,'ta-IN'),undefined);
  const clean=speechText('**পণ্য সংরক্ষণ হয়েছে।**\n দাম ২০০ টাকা।');assert.equal(clean,'পণ্য সংরক্ষণ হয়েছে। দাম ২০০ টাকা।');
  assert.deepEqual(splitSpeech(clean),['পণ্য সংরক্ষণ হয়েছে।','দাম ২০০ টাকা।']);
  const long='পণ্য '.repeat(100).trim();assert.equal(splitSpeech(long).join(' '),long);assert.ok(splitSpeech(long).every(chunk=>chunk.length<=180));
});
test('natural TTS preserves WAV and wraps legacy PCM with its real sample rate',async()=>{
  const oldFetch=globalThis.fetch;const saved={key:process.env.TTS_API_KEY,provider:process.env.TTS_PROVIDER,model:process.env.TTS_MODEL};
  process.env.TTS_API_KEY='test-placeholder';process.env.TTS_PROVIDER='gemini';process.env.TTS_MODEL='gemini-3.8-flash-tts';
  try{
    const wav=await synthesizeSpeech('নমস্কার','bn');let payload:any;
    globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options!.body as string);return new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{data:wav.toString('base64'),mimeType:'audio/wav'}}]}}]}));};
    assert.deepEqual(await synthesizeNaturalSpeech('নমস্কার','bn'),wav);assert.equal(payload.contents[0].parts[0].text,'নমস্কার');assert.match(payload.contents[0].parts[0].speechMetadata.style,/bn-IN/);assert.equal(payload.generationConfig.speechConfig.voiceConfig.voice,'Kore');
    process.env.TTS_MODEL='gemini-2.5-flash-preview-tts';const pcm=Buffer.alloc(48000);for(let i=0;i<pcm.length;i+=2)pcm.writeInt16LE(i%4?-1000:1000,i);
    globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{data:pcm.toString('base64'),mimeType:'audio/L16;codec=pcm;rate=24000'}}]}}]}));
    const wrapped=await synthesizeNaturalSpeech('নমস্কার','bn');assert.equal(wrapped.readUInt32LE(24),24000);assert.equal(wrapped.readUInt32LE(40),48000);
    globalThis.fetch=async()=>new Response('{}',{status:503});await assert.rejects(synthesizeNaturalSpeech('নমস্কার','bn'),/unavailable/);
  }finally{globalThis.fetch=oldFetch;for(const [env,value]of Object.entries({TTS_API_KEY:saved.key,TTS_PROVIDER:saved.provider,TTS_MODEL:saved.model})){if(value===undefined)delete process.env[env];else process.env[env]=value;}}
});
test('speech synthesis validates unsupported languages and excessive text', async () => {
  await assert.rejects(synthesizeSpeech('Hello','unsupported' as VoiceLanguage),/Unsupported/);
  await assert.rejects(synthesizeSpeech('x'.repeat(1001),'en'),/1000/);
});
test('website controls and natural native search commands have concrete actions', () => {
  assert.equal(parseNativeCommand('নিচে যাও').data?.command,'scroll_down');
  assert.equal(parseNativeCommand('read this page').data?.command,'read');
  assert.equal(parseNativeCommand('go back').data?.command,'back');
  assert.equal(parseNativeCommand('ডেলিভারি দেখাও').data?.path,'/marketplace?delivery=true');
  assert.equal(parseNativeCommand('আমাকে চাল খুঁজে দাও').data?.search,'চাল');
  assert.equal(parseNativeCommand('চাল').data?.search,'চাল');
  assert.equal(parseNativeCommand('Fine rice in the marketplace.').data?.search,'rice');
});
