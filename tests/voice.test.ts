import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNativeCommand, normalizeDigits, speechLocales, isVoiceConfirmation } from '../shared/voiceCommands';
import { encodeWav } from '../src/lib/audio';
import { t } from '../src/i18n/translations';
import { detectTextLanguage, expandProductSearch } from '../shared/languages';
import { productComplete, normalizeSpokenNumbers } from '../shared/productVoice';

test('native commands preserve native product names in all languages', () => {
  for (const [phrase, expected] of [['find rice','rice'],['चावल खोजो','चावल'],['চাল খুঁজুন','চাল'],['அரிசி தேடு','அரிசி'],['బియ్యం వెతుకు','బియ్యం'],['तांदूळ शोधा','तांदूळ'],['ચોખા શોધો','ચોખા']]) {
    const intent = parseNativeCommand(phrase);
    assert.equal(intent.action, 'search_product'); assert.equal(intent.data?.search, expected);
  }
});
test('product commands require manager role and complete positive pricing', () => {
  assert.equal(parseNativeCommand('add rice for 200 rupees', 'customer').action, 'unknown');
  assert.equal(productComplete(parseNativeCommand('add rice', 'manager').data), false);
  assert.equal(productComplete(parseNativeCommand('add rice for 0 rupees', 'manager').data), false);
  const draft = parseNativeCommand('চাল যোগ করুন ২০০ টাকা', 'manager');
  assert.equal(draft.action, 'create_product'); assert.equal(draft.data?.price, 200); assert.equal(draft.data?.name, 'চাল');
});
test('product agent collects missing fields, spoken amounts and corrections', () => {
  let draft = parseNativeCommand('add new product','manager').data;
  assert.equal(draft?.name,undefined);
  draft = parseNativeCommand('Basmati rice','manager',draft).data;
  assert.equal(draft?.name,'basmati rice');
  assert.equal(productComplete(draft),false);
  draft = parseNativeCommand('price two hundred fifty rupees quantity five units','manager',draft).data;
  assert.equal(draft?.name,'basmati rice'); assert.equal(draft?.price,250); assert.equal(draft?.quantity,5);
  assert.equal(productComplete(draft),true);
  draft = parseNativeCommand('change price to three hundred','manager',draft).data;
  assert.equal(draft?.price,300); assert.equal(draft?.name,'basmati rice');
  assert.equal(parseNativeCommand('search honey','manager',draft).action,'search_product');
  for (const [phrase,amount] of [['চাল যোগ করুন দুইশো টাকা',200],['add rice price two hundred',200],['जोड़ो चावल कीमत दो सौ',200],['அரிசி சேர் விலை இருபது',20],['బియ్యం జోడించు ధర ఇరవై',20],['तांदूळ जोडा किंमत वीस',20],['ચોખા ઉમેરો કિંમત વીસ',20]] as const) {
    const result = parseNativeCommand(phrase,'manager');
    assert.equal(result.action,'create_product'); assert.equal(result.data?.price,amount,phrase);
    assert.equal(productComplete(result.data),true,phrase);
  }
  assert.equal(normalizeSpokenNumbers('one thousand two hundred fifty'),'1250');
  assert.equal(normalizeSpokenNumbers('two zero zero'),'200');
  assert.equal(normalizeSpokenNumbers('two point five'),'2.5');
  assert.equal(parseNativeCommand('add honey price 1,200','manager').data?.price,1200);
  const nativeStock = parseNativeCommand('একটি নতুন পণ্য চাল যোগ করুন দাম দুইশো টাকা স্টক পাঁচটি','manager');
  assert.equal(nativeStock.data?.name,'চাল'); assert.equal(nativeStock.data?.quantity,5);
  const invalidStock = parseNativeCommand('add rice price 200 quantity 0','manager');
  assert.equal(invalidStock.message,'What is the quantity? Say a positive amount.');
  assert.equal(parseNativeCommand('five','manager',invalidStock.data).data?.quantity,5);
});
test('structured product details and delivery remain creation rather than navigation', () => {
  const result = parseNativeCommand('add product name rice, price 200, stock 10, description fresh rice, category Groceries, delivery yes','manager');
  assert.equal(result.action,'create_product');
  assert.equal(result.data?.name,'rice'); assert.equal(result.data?.price,200);
  assert.equal(result.data?.quantity,10); assert.equal(result.data?.description,'fresh rice');
  assert.equal(result.data?.deliveryAvailable,true);
});
test('native confirmation, cancellation, navigation and digits', () => {
  for (const text of ['yes','हाँ','হ্যাঁ','ஆம்','అవును','होय','હા']) assert.equal(parseNativeCommand(text).action, 'confirm');
  for(const text of ['yes please','হ্যাঁ করুন','हाँ करो','ಹೌದು','അതെ','ਹਾਂ','ہاں'])assert.equal(isVoiceConfirmation(text),true,text);
  for(const text of ['yes but change the price','no','yes delete all users'])assert.equal(isVoiceConfirmation(text),false,text);
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
  for (const lang of ['en','hi','bn','ta','te','mr','gu'] as ('en'|'hi'|'bn'|'ta'|'te'|'mr'|'gu')[]) {
    for (const key of ['Voice Assistant','My Inventory','My Requests','Confirm','Listening...']) if (lang !== 'en') assert.notEqual(t(key,lang), key);
  }
});
test('native searches find catalog terms across languages without a model', () => {
  assert.ok(expandProductSearch('চাল').includes('rice'));
  assert.ok(expandProductSearch('rice').includes('அரிசி'));
  assert.ok(expandProductSearch('rise').includes('rice'));
  assert.equal(parseNativeCommand('Please search for Rise in the Marketplace').data?.search,'Rise');
  assert.deepEqual(expandProductSearch('handmade bowl'), ['handmade bowl']);
  assert.equal(detectTextLanguage('চাল'),'bn');
  assert.equal(detectTextLanguage('அரிசி'),'ta');
});
