import { pipeline, env } from '@xenova/transformers';
import wavefile from 'wavefile';
const { WaveFile } = wavefile;

// Disable local models loading from an absolute path (forces download from HuggingFace to cache)
env.allowLocalModels = false;
env.useBrowserCache = false; // We are in node

let transcriber: any = null;
let translator: any = null;

// Initialize the models
export async function initializeAI() {
  console.log('Initializing local AI models. This may take a while on first run (downloading weights)...');
  
  try {
    if (!transcriber) {
      console.log('Loading Whisper model (Speech-to-Text)...');
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    }
    
    if (!translator) {
      console.log('Loading NLLB model (Translation)...');
      translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M');
    }
    
    console.log('AI models loaded successfully.');
  } catch (err) {
    console.error('Error loading AI models:', err);
  }
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
  return audioData as Float32Array;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  if (!transcriber) await initializeAI();
  try {
    const audioData = convertAudioBuffer(audioBuffer);
    const result = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'english',
      task: 'transcribe',
    });
    return result.text;
  } catch (err) {
    console.error('Transcription error:', err);
    throw err;
  }
}

const langCodes: Record<string, string> = {
  'hi': 'hin_Deva', // Hindi
  'bn': 'ben_Beng', // Bengali
  'en': 'eng_Latn', // English
};

export async function translateText(text: string, srcLang: string, tgtLang: string): Promise<string> {
  if (!translator) await initializeAI();
  const src = langCodes[srcLang] || 'eng_Latn';
  const tgt = langCodes[tgtLang] || 'eng_Latn';
  
  if (src === tgt) return text;

  try {
    const result = await translator(text, {
      src_lang: src,
      tgt_lang: tgt,
    });
    return result[0].translation_text;
  } catch (err) {
    console.error('Translation error:', err);
    return text; // fallback
  }
}

export async function parseIntent(text: string): Promise<any> {
  // Simple heuristic/keyword based extraction since local models might be too heavy or hallucinate
  // For product creation, format typically expected: "Add 5kg of rice for 200 rupees"
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('add') || lowerText.includes('create') || lowerText.includes('new product')) {
    // Basic regex extraction
    const qtyMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(kg|g|liters?|pcs|packets?)/);
    const priceMatch = lowerText.match(/(?:for|rs|rupees)\s*(\d+(?:\.\d+)?)/) || lowerText.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs)/);
    
    // Naive name extraction
    let name = text.replace(/add|create|new product|for|rupees|rs/gi, '').trim();
    if (qtyMatch) name = name.replace(qtyMatch[0], '');
    if (priceMatch) name = name.replace(priceMatch[0], '');
    
    // clean up
    name = name.replace(/of|with/gi, '').replace(/\s+/g, ' ').trim();
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
    let query = text.replace(/find|search|looking for|me|some/gi, '').trim();
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
