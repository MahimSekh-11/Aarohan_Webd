import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeSpeech } from '../backend/speechSynthesis.js';
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
  }
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
