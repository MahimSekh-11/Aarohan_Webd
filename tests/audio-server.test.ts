import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from '../src/lib/audio';
import { convertAudioBuffer, transcribeAudio } from '../backend/aiService.js';

test('browser PCM WAV decodes on the server into normalized 16kHz float audio', async () => {
  const samples = new Float32Array(32000);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i * 2 * Math.PI * 440 / 32000) * 0.5;
  const buffer = Buffer.from(await encodeWav(samples,32000).arrayBuffer());
  const decoded = convertAudioBuffer(buffer);
  assert.ok(decoded instanceof Float32Array);
  assert.ok(Math.abs(decoded.length - 16000) < 10);
  assert.ok(decoded.some(sample => Math.abs(sample) > 0.4));
  assert.ok(decoded.every(sample => Number.isFinite(sample) && Math.abs(sample) <= 1));
});
test('silent audio and unsupported languages fail before downloading speech models', async () => {
  const silence = Buffer.from(await encodeWav(new Float32Array(16000),16000).arrayBuffer());
  await assert.rejects(transcribeAudio(silence,'bn'), /No speech detected/);
  await assert.rejects(transcribeAudio(silence,'unknown'), /Unsupported speech language/);
});
