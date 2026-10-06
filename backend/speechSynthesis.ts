import EspeakInitializer from '@echogarden/espeak-ng-emscripten';
import { encodeWav } from '../src/lib/audio.js';
import { speechLocales, type VoiceLanguage } from '../shared/voiceCommands.js';

let initializing: Promise<any> | undefined;
let queue: Promise<unknown> = Promise.resolve();
async function getEngine() {
  initializing ??= EspeakInitializer().then((module: any) => new module.eSpeakNGWorker())
    .catch((error: unknown) => { initializing = undefined; throw error; });
  return initializing;
}
export async function synthesizeSpeech(text: string, language: VoiceLanguage): Promise<Buffer> {
  if (!speechLocales[language]) throw new Error('Unsupported speech language');
  if (!text.trim() || text.length > 1000) throw new Error('Speech text must contain 1 to 1000 characters');
  const run = queue.then(async () => {
    const engine = await getEngine();
    engine.set_voice(language === 'en' ? 'en' : language);
    // eSpeak takes integer words/minute, not the browser's 0.1–10 rate ratio.
    engine.set_rate(language === 'en' ? 165 : 150);
    const chunks: Float32Array[] = [];
    engine.synthesize(text.replace(/[<>]/g, ''), (samples: Int16Array) => {
      if (samples?.length) chunks.push(Float32Array.from(samples, sample => sample / 32768));
    });
    const combined = new Float32Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    if (!combined.length) throw new Error('Speech engine produced no audio');
    return Buffer.from(await encodeWav(combined, engine.get_samplerate()).arrayBuffer());
  });
  queue = run.catch(() => {});
  return run;
}

export function naturalSpeechConfigured(){return process.env.TTS_PROVIDER !== 'local' && !!(process.env.TTS_API_KEY || process.env.GEMINI_API_KEY);}

// Gemini returns WAV for current models; legacy models return raw 24 kHz PCM.
// Convert the latter explicitly instead of decoding PCM as a file in the browser.
export async function synthesizeNaturalSpeech(text:string,language:VoiceLanguage):Promise<Buffer>{
  if(!speechLocales[language] || !text.trim() || text.length>1000)throw new Error('Invalid speech text or language');
  if(!naturalSpeechConfigured())throw new Error('Natural speech is not configured');
  const model=process.env.TTS_MODEL || 'gemini-3.8-flash-tts';
  const modern=/gemini-3\.8/.test(model);
  const voice=process.env.TTS_VOICE || 'Kore';
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.TTS_API_KEY || process.env.GEMINI_API_KEY!},signal:AbortSignal.timeout(25000),
    body:JSON.stringify({contents:[{role:'user',parts:[{text,...(modern?{speechMetadata:{style:`Speak clearly and naturally in ${speechLocales[language]}, at a comfortable conversational pace.`}}:{})}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:modern?{voice}:{prebuiltVoiceConfig:{voiceName:voice}}}}}),
  });
  if(!response.ok)throw new Error('Natural speech provider unavailable');
  const result=await response.json();
  const part=result.candidates?.[0]?.content?.parts?.find((part:any)=>part.inlineData?.data)?.inlineData;
  if(!part || typeof part.data!=='string' || part.data.length>20000000)throw new Error('Invalid speech audio');
  const bytes=Buffer.from(part.data,'base64');
  if(bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WAVE')return bytes;
  if(!/^audio\/(?:l16|pcm)/i.test(part.mimeType || '') || bytes.length<2 || bytes.length%2)throw new Error('Invalid speech audio');
  const rate=Number(part.mimeType.match(/rate=(\d+)/i)?.[1] || 24000);
  if(![8000,16000,22050,24000,44100,48000].includes(rate))throw new Error('Invalid speech audio');
  const samples=Float32Array.from({length:bytes.length/2},(_,index)=>bytes.readInt16LE(index*2)/32768);
  return Buffer.from(await encodeWav(samples,rate).arrayBuffer());
}
