import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNativeCommand, normalizeDigits, speechLocales } from '../shared/voiceCommands';
import { encodeWav } from '../src/lib/audio';
import { t } from '../src/i18n/translations';
import { detectTextLanguage, expandProductSearch } from '../shared/languages';

test('native commands preserve native product names in all languages', () => {
  for (const [phrase, expected] of [['find rice','rice'],['चावल खोजो','चावल'],['চাল খুঁজুন','চাল'],['அரிசி தேடு','அரிசி'],['బియ్యం వెతుకు','బియ్యం'],['तांदूळ शोधा','तांदूळ'],['ચોખા શોધો','ચોખા']]) {
    const intent = parseNativeCommand(phrase);
    assert.equal(intent.action, 'search_product'); assert.equal(intent.data?.search, expected);
  }
});
test('product commands require manager role and complete positive pricing', () => {
  assert.equal(parseNativeCommand('add rice for 200 rupees', 'customer').action, 'unknown');
  assert.equal(parseNativeCommand('add rice', 'manager').action, 'unknown');
  assert.equal(parseNativeCommand('add rice for 0 rupees', 'manager').action, 'unknown');
  const draft = parseNativeCommand('চাল যোগ করুন ২০০ টাকা', 'manager');
  assert.equal(draft.action, 'create_product'); assert.equal(draft.data?.price, 200); assert.equal(draft.data?.name, 'চাল');
});
test('native confirmation, cancellation, navigation and digits', () => {
  for (const text of ['yes','हाँ','হ্যাঁ','ஆம்','అవును','होय','હા']) assert.equal(parseNativeCommand(text).action, 'confirm');
  for (const text of ['cancel','रद्द','বাতিল','ரத்து','రద్దు','રદ']) {
    assert.equal(parseNativeCommand(text).action, 'cancel');
  }
  assert.equal(parseNativeCommand('আমার দোকান খুলুন','manager').data?.path,'/manager');
  assert.equal(parseNativeCommand('open my requests','customer').data?.path,'/customer?tab=requests');
  assert.equal(normalizeDigits('१२৩৪௫౬૭'), '1234567');
});
test('audio fallback produces real PCM WAV with correct sample rate and clipping', async () => {
  const data = new DataView(await encodeWav(new Float32Array([-2,0,2]), 16000).arrayBuffer());
  const marker = (offset: number) => String.fromCharCode(...[0,1,2,3].map(i => data.getUint8(offset+i)));
  assert.equal(marker(0),'RIFF'); assert.equal(marker(8),'WAVE');
  assert.equal(data.getUint32(24,true),16000); assert.equal(data.getUint16(34,true),16);
  assert.equal(data.getUint32(40,true),6); assert.equal(data.getInt16(44,true),-32768); assert.equal(data.getInt16(48,true),32767);
});
test('every locale has offline assistant and inventory labels', () => {
  for (const lang of Object.keys(speechLocales) as (keyof typeof speechLocales)[]) {
    for (const key of ['Voice Assistant','My Inventory','My Requests','Confirm','Listening...']) if (lang !== 'en') assert.notEqual(t(key,lang), key);
  }
});
test('native searches find catalog terms across languages without a model', () => {
  assert.ok(expandProductSearch('চাল').includes('rice'));
  assert.ok(expandProductSearch('rice').includes('அரிசி'));
  assert.deepEqual(expandProductSearch('handmade bowl'), ['handmade bowl']);
  assert.equal(detectTextLanguage('চাল'),'bn');
  assert.equal(detectTextLanguage('அரிசி'),'ta');
});
