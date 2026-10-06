export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    write(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true);
    write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, sample * (sample < 0 ? 32768 : 32767), true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

// Capture PCM directly, avoiding browser recording codec/decoder mismatches.
export async function startPcmRecording(onSpeechEnd?: () => void): Promise<{ stop: () => Promise<Blob>; cancel: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const mute = context.createGain(); mute.gain.value = 0;
    const chunks: Float32Array[] = [];
    let hasSpeech = false; let silence = 0; let signaled = false;
    processor.onaudioprocess = event => {
      const samples = new Float32Array(event.inputBuffer.getChannelData(0));
      chunks.push(samples);
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
      if (rms > 0.012) { hasSpeech = true; silence = 0; }
      else if (hasSpeech) silence += samples.length / context!.sampleRate;
      if (hasSpeech && silence > 2.5 && !signaled) { signaled = true; onSpeechEnd?.(); }
    };
    source.connect(processor); processor.connect(mute); mute.connect(context.destination);
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      processor.onaudioprocess = null;
      source.disconnect(); processor.disconnect(); mute.disconnect();
      stream.getTracks().forEach(track => track.stop());
      void context!.close();
    };
    return {
      cancel: close,
      stop: async () => {
        close();
        const samples = new Float32Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
        if (!samples.length || samples.every(sample => Math.abs(sample) < 0.001)) throw new Error('No speech detected. Please try again.');
        return encodeWav(samples, context!.sampleRate);
      },
    };
  } catch (error) { stream.getTracks().forEach(track => track.stop()); void context?.close(); throw error; }
}
