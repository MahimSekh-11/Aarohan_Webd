import { pipeline, env } from '@xenova/transformers';
import wavefile from 'wavefile';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { WaveFile } = wavefile;

// Disable local models loading from an absolute path (forces download from HuggingFace to cache)
env.allowLocalModels = false;
env.useBrowserCache = false; // We are in node
if (process.env.VERCEL) {
  env.cacheDir = join(tmpdir(), 'aarohan-ai-cache');
}

let transcriber: any = null;
let translator: any = null;
let transcriberLoading: Promise<any> | null = null;
let translatorLoading: Promise<any> | null = null;
let translationQueue: Promise<unknown> = Promise.resolve();
let transcriptionQueue: Promise<unknown> = Promise.resolve();
const speechState: { state: 'idle' | 'loading' | 'ready' | 'error' } = { state:'idle' };
export function getSpeechStatus() { return { ...speechState, model:process.env.WHISPER_MODEL || 'Xenova/whisper-base' }; }
export async function prepareSpeech() { await loadTranscriber(); }

export const langCodes: Record<string, string> = {
  en: 'eng_Latn', hi: 'hin_Deva', bn: 'ben_Beng', ta: 'tam_Taml',
  te: 'tel_Telu', mr: 'mar_Deva', gu: 'guj_Gujr',
};
const speechLanguages: Record<string, string> = {
  en: 'english', hi: 'hindi', bn: 'bengali', ta: 'tamil',
  te: 'telugu', mr: 'marathi', gu: 'gujarati',
};

async function loadTranscriber() {
  if (transcriber) return transcriber;
  speechState.state = 'loading';
  transcriberLoading ??= pipeline('automatic-speech-recognition', process.env.WHISPER_MODEL || 'Xenova/whisper-base')
    .then(model => { speechState.state = 'ready'; return transcriber = model; }).catch(error => { speechState.state = 'error'; transcriberLoading = null; throw error; });
  return transcriberLoading;
}

async function loadTranslator() {
  if (translator) return translator;
  translatorLoading ??= pipeline('translation', 'Xenova/nllb-200-distilled-600M')
    .then(model => translator = model).catch(error => { translatorLoading = null; throw error; });
  return translatorLoading;
}

// Initialize the models
export async function initializeAI() {
  await loadTranscriber();
  await loadTranslator();
}

// Convert audio buffer to Float32Array for Whisper
export function convertAudioBuffer(buffer: Buffer): Float32Array {
  const wav = new WaveFile(buffer);
  wav.toBitDepth('32f');
  wav.toSampleRate(16000);
  let audioData = wav.getSamples();
  
  // If stereo, take the first channel
  if (Array.isArray(audioData)) {
    audioData = audioData[0];
  }
  return Float32Array.from(audioData);
}

export async function transcribeAudio(audioBuffer: Buffer, language = 'en'): Promise<string> {
  if (!speechLanguages[language]) throw new Error('Unsupported speech language');
  try {
    const audioData = convertAudioBuffer(audioBuffer);
    if (!audioData.length || audioData.every(sample => Math.abs(sample) < 0.001)) throw new Error('No speech detected. Please try again.');
    if (audioData.length > 16000 * 35) throw new Error('Recording is too long. Please record at most 30 seconds.');
    await loadTranscriber();
    const run = transcriptionQueue.then(() => transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: speechLanguages[language],
      task: 'transcribe',
      max_new_tokens: 256,
      num_beams: 3,
      // Repeated product names and number words are meaningful in commands.
      // Penalizing repetition changes the transcript rather than improving it.
    }));
    transcriptionQueue = run.catch(() => {});
    const result = await run;
    if (!result.text?.trim()) throw new Error('No speech detected. Please try again.');
    return result.text.trim();
  } catch (err) {
    console.error('Transcription error:', err);
    throw err;
  }
}

export async function translateText(text: string, srcLang: string, tgtLang: string): Promise<string> {
  const src = langCodes[srcLang];
  const tgt = langCodes[tgtLang];
  if (!src || !tgt) throw new Error('Unsupported translation language');
  
  if (src === tgt) return text;
  await loadTranslator();

  try {
    const run = translationQueue.then(() => translator(text, {
      src_lang: src,
      tgt_lang: tgt,
    }));
    translationQueue = run.catch(() => {});
    const result = await run;
    return result[0].translation_text;
  } catch (err) {
    console.error('Translation error:', err);
    throw err;
  }
}

export async function parseIntent(text: string): Promise<any> {
  // Simple heuristic/keyword based extraction since local models might be too heavy or hallucinate
  // For product creation, format typically expected: "Add 5kg of rice for 200 rupees"
  const lowerText = text.toLowerCase();
  
  if (/\b(add|create|new product)\b/.test(lowerText)) {
    // Basic regex extraction
    const qtyMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(kg|g|liters?|pcs|packets?)/);
    const priceMatch = lowerText.match(/(?:for|rs|rupees)\s*(\d+(?:\.\d+)?)/) || lowerText.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs)/);
    
    // Naive name extraction
    let name = text.replace(/add|create|new product|for|rupees|rs/gi, '').trim();
    if (qtyMatch) name = name.replace(qtyMatch[0], '');
    if (priceMatch) name = name.replace(priceMatch[0], '');
    
    // clean up
    name = name.replace(/\b(of|with)\b/gi, '').replace(/\s+/g, ' ').trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
    const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
    
    let category = 'Others';
    if (/rice|wheat|dal|grains/i.test(name)) category = 'Grains';
    else if (/apple|banana|mango|fruit/i.test(name)) category = 'Fruits';
    else if (/potato|onion|tomato|vegetable/i.test(name)) category = 'Vegetables';
    
    return {
      action: 'create_product',
      data: {
        name: name || 'Unnamed Product',
        description: `Locally sourced ${name || 'product'}. Quantity: ${qtyMatch ? qtyMatch[0] : 1}`,
        price: price,
        actualPrice: Math.round(price * 1.1),
        quantity: quantity,
        category: category,
        deliveryAvailable: true
      },
      message: `I understood you want to add a product: ${name}, Price: ₹${price}.`
    };
  } else if (lowerText.includes('find') || lowerText.includes('search') || lowerText.includes('looking for')) {
    let query = text.replace(/\b(find|search|looking for|me|some)\b/gi, '').trim();
    return {
      action: 'search_product',
      data: { search: query },
      message: `Searching for ${query}...`
    };
  }
  
  return {
    action: 'unknown',
    message: 'I did not understand the command.'
  };
}
