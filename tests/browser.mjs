import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
let saves = 0;
let voiceLanguage;
let spokenLanguages = [];
let healthChecks = 0;
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname;
  let body = [];
  if (path === '/api/auth/me') body = { _id:'manager1', name:'Test Manager', role:'manager', storeName:'Test Store' };
  if (path === '/api/ai/speech/status') {
    healthChecks++;
    if (healthChecks === 1) return route.fulfill({status:503,json:{state:'error'}});
    body = {state:'ready'};
  }
  if (path === '/api/products' && route.request().method() === 'POST') {
    const product = route.request().postDataJSON();
    assert.ok(product.name); assert.equal(product.price,200);
    saves++; body = { _id:'created' };
  }
  if (path === '/api/ai/transcribe-and-intent') { voiceLanguage = route.request().postDataBuffer().toString().includes('bn'); body = { transcript:'চাল খুঁজুন' }; }
  if (path === '/api/ai/speak') {
    spokenLanguages.push(route.request().postDataJSON().language);
    return route.fulfill({ contentType:'audio/wav', body:Buffer.from('RIFFstubWAVE') });
  }
  return route.fulfill({ json: body });
});
await page.addInitScript(() => {
  localStorage.setItem('token','test-token');
  if (!localStorage.getItem('user')) localStorage.setItem('user',JSON.stringify({ _id:'manager1', name:'Test Manager', role:'manager', storeName:'Test Store' }));
  class FakeRecognition {
    start() {
      window.__recognitionLocale = this.lang;
      if (window.__failRecognition) {
        setTimeout(() => { this.onerror?.({error:'network'}); this.onend?.(); },10); return;
      }
      setTimeout(() => {
        const transcript = window.__voiceTurns?.shift() || 'চাল খুঁজুন';
        this.onresult?.({ resultIndex:0, results:Object.assign([[{transcript}]], { length:1 }) });
        const final = [{ transcript, confidence:window.__confidence ?? 0.95 }]; final.isFinal = true;
        this.onresult?.({ resultIndex:0, results:[final] }); this.onend?.();
      }, 10);
    }
    stop() { this.onend?.(); } abort() {}
  }
  window.SpeechRecognition = FakeRecognition;
  // Model the PCM capture API without depending on a real microphone.
  navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }] });
  window.AudioContext = class {
    sampleRate = 16000; destination = {};
    async resume() {} async close() {}
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    async decodeAudioData() { return {}; }
    createBufferSource() { return { connect() {}, start() { setTimeout(() => this.onended?.(),20); }, stop() {} }; }
    createGain() { return { gain:{ value:0 }, connect() {}, disconnect() {} }; }
    createScriptProcessor() {
      const processor = { connect() {}, disconnect() {}, onaudioprocess:null };
      setTimeout(() => processor.onaudioprocess?.({ inputBuffer: { getChannelData:() => new Float32Array([0.1,0.2,0.1]) } }), 10);
      return processor;
    }
  };
});
try {
  await page.goto('http://127.0.0.1:5178/');
  const labels = { hi:'मेरा अनुरोध',bn:'আমার অনুরোধ',ta:'என் கோரிக்கைகள்',te:'నా అభ్యర్థనలు',mr:'माझ्या विनंत्या',gu:'મારી વિનંતીઓ' };
  for (const lang of Object.keys(labels)) {
    await page.getByLabel('Language',{exact:true}).selectOption(lang);
    await page.goto('http://127.0.0.1:5178/marketplace');
    await page.waitForFunction(lang => document.documentElement.lang === lang,lang);
    const text = await page.locator('body').innerText();
    assert.ok(!text.includes('All Categories'), `${lang}: category label remained English`);
    assert.ok(!text.includes('Delivery Available'), `${lang}: delivery label remained English`);
    await page.goto('http://127.0.0.1:5178/manager');
    await page.getByRole('button',{name:/./}).first().waitFor();
    await page.waitForFunction(() => document.body.innerText.includes('Test Store'));
    const managerText = await page.locator('body').innerText();
    assert.ok(!managerText.includes('My Inventory'), `${lang}: inventory label remained English`);
    assert.ok(!managerText.includes('My Active Listings'), `${lang}: manager heading remained English`);
    await page.evaluate(() => localStorage.setItem('user',JSON.stringify({_id:'admin1',name:'Test Admin',role:'admin'})));
    await page.goto('http://127.0.0.1:5178/admin');
    await page.waitForFunction(() => document.body.innerText.includes('Test Admin'));
    assert.ok(!(await page.locator('body').innerText()).includes('Customer Access Management'), `${lang}: admin label remained English`);
    await page.evaluate(() => localStorage.setItem('user',JSON.stringify({_id:'customer1',name:'Test Customer',role:'customer'})));
    await page.goto('http://127.0.0.1:5178/customer?tab=requests');
    await page.waitForFunction(() => document.body.innerText.includes('Test Customer'));
    assert.ok(!(await page.locator('body').innerText()).includes('No requests yet'), `${lang}: customer label remained English`);
    await page.evaluate(() => localStorage.setItem('user',JSON.stringify({_id:'manager1',name:'Test Manager',role:'manager',storeName:'Test Store'})));
    await page.goto('http://127.0.0.1:5178/manager');
  }
  await page.getByLabel('Language',{exact:true}).selectOption('bn');
  await page.getByRole('button',{name:'সহায়কের সঙ্গে বলুন'}).click();
  await page.waitForURL('**/marketplace?search=*');
  assert.equal(await page.evaluate(() => window.__recognitionLocale), 'bn-IN');
  assert.equal(new URL(page.url()).searchParams.get('search'),'চাল');
  await page.waitForFunction(() => document.querySelector('input[placeholder="পণ্য খুঁজুন..."]')?.value === 'চাল');
  assert.equal(await page.locator('input[placeholder="পণ্য খুঁজুন..."]').inputValue(),'চাল');
  await page.waitForFunction(() => !document.body.innerText.includes('স্থানীয় কণ্ঠ ইঞ্জিন নেই।'));
  assert.ok(healthChecks >= 2,'Speech health automatically recovers after the backend becomes reachable');
    await page.getByRole('checkbox',{name:'সম্পূর্ণ তথ্যের পণ্য স্বয়ংক্রিয়ভাবে সংরক্ষণ করুন'}).uncheck();
    await page.getByLabel('নির্দেশ লিখুন').fill('চাল যোগ করুন ২০০ টাকা');
  await page.getByRole('button',{name:'পাঠান',exact:true}).click();
  await page.getByRole('button',{name:'নিশ্চিত করুন',exact:true}).waitFor();
  assert.equal(saves,0,'A product must not save before confirmation');
  await page.getByRole('button',{name:'নিশ্চিত করুন',exact:true}).click();
  await page.waitForURL('**/manager');
  assert.equal(saves,1);
    await page.getByRole('checkbox',{name:'সম্পূর্ণ তথ্যের পণ্য স্বয়ংক্রিয়ভাবে সংরক্ষণ করুন'}).check();
    await page.getByLabel('নির্দেশ লিখুন').fill('চাল যোগ করুন দুইশো টাকা');
    await page.getByRole('button',{name:'পাঠান',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('পণ্য সংরক্ষণ হয়েছে।'));
    assert.equal(saves,2,'A complete spoken-price command saves automatically');
  await page.evaluate(() => { window.__voiceTurns = ['নতুন পণ্য','চাল','দুইশো টাকা']; });
  await page.getByRole('button',{name:'সহায়কের সঙ্গে বলুন'}).click();
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('পণ্য সংরক্ষণ হয়েছে।'));
  assert.equal(saves,3,'The agent asks, listens again, merges replies, then creates the listing');
  await page.evaluate(() => { window.__voiceTurns = ['চাল যোগ করুন দুইশো টাকা']; window.__confidence=0.4; });
  await page.getByRole('button',{name:'সহায়কের সঙ্গে বলুন'}).click();
  await page.getByRole('button',{name:'নিশ্চিত করুন',exact:true}).waitFor();
  assert.equal(saves,3,'Low-confidence recognition requires review');
  await page.getByRole('button',{name:'বাতিল করুন',exact:true}).click();
  await page.evaluate(() => { window.__confidence=0.95; });
  await page.getByRole('button',{name:'অডিও রেকর্ডিং ব্যবহার করুন'}).click();
  await page.getByRole('button',{name:'রেকর্ডিং থামান'}).waitFor();
  await page.waitForTimeout(50);
  await page.getByRole('button',{name:'রেকর্ডিং থামান'}).click();
  await page.waitForURL('**/marketplace?search=*');
  assert.equal(voiceLanguage,true,'Audio fallback must send the selected language');
  await page.evaluate(() => { window.__failRecognition = true; });
  await page.getByRole('button',{name:'সহায়কের সঙ্গে বলুন'}).click();
  await page.waitForTimeout(100);
  assert.ok(!(await page.locator('body').innerText()).includes('Speech service unavailable'));
  await page.getByRole('button',{name:'রেকর্ডিং থামান'}).click();
  await page.getByRole('button',{name:'সহায়কের সঙ্গে বলুন'}).waitFor();
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('পণ্য খুঁজছি'));
  assert.ok(spokenLanguages.includes('bn'),'Native reply audio must be requested when no system Bengali voice exists');
  assert.deepEqual(errors,[]);
  console.log('Browser passed: six languages; Bengali search; automatic and confirmed creation; hands-free product dialogue; confidence review; backend recovery; PCM fallback.');
} finally { await browser.close(); }
