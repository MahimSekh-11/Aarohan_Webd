import EspeakInitializer from '@echogarden/espeak-ng-emscripten';
import { encodeWav } from '../src/lib/audio';
import { speechLocales, type VoiceLanguage } from '../shared/voiceCommands';

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
    engine.set_rate(0.9);
    const chunks: Float32Array[] = [];
    engine.synthesize(text.replace(/[<>]/g, ''), (samples: Int16Array) => {
      if (samples?.length) chunks.push(Float32Array.from(samples, sample => sample / 32768));
    });
    const combined = new Float32Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    if (!combined.length) throw new Error('Speech engine produced no audio');
    return Buffer.from(await encodeWav(combined, 22050).arrayBuffer());
  });
  queue = run.catch(() => {});
  return run;
}
