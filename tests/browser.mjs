import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
let saves = 0;
let voiceLanguage;
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname;
  let body = [];
  if (path === '/api/auth/me') body = { _id:'manager1', name:'Test Manager', role:'manager', storeName:'Test Store' };
  if (path === '/api/products' && route.request().method() === 'POST') { saves++; body = { _id:'created' }; }
  if (path === '/api/ai/transcribe-and-intent') { voiceLanguage = route.request().postDataBuffer().toString().includes('bn'); body = { transcript:'চাল খুঁজুন' }; }
  return route.fulfill({ json: body });
});
await page.addInitScript(() => {
  localStorage.setItem('token','test-token');
  if (!localStorage.getItem('user')) localStorage.setItem('user',JSON.stringify({ _id:'manager1', name:'Test Manager', role:'manager', storeName:'Test Store' }));
  class FakeRecognition {
    start() {
      window.__recognitionLocale = this.lang;
      setTimeout(() => {
        this.onresult?.({ resultIndex:0, results:Object.assign([[{transcript:'চাল খুঁজুন'}]], { length:1 }) });
        const final = [{ transcript:'চাল খুঁজুন' }]; final.isFinal = true;
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
  await page.getByLabel('নির্দেশ লিখুন').fill('চাল যোগ করুন ২০০ টাকা');
  await page.getByRole('button',{name:'পাঠান',exact:true}).click();
  await page.getByRole('button',{name:'নিশ্চিত করুন',exact:true}).waitFor();
  assert.equal(saves,0,'A product must not save before confirmation');
  await page.getByRole('button',{name:'নিশ্চিত করুন',exact:true}).click();
  await page.waitForURL('**/manager');
  assert.equal(saves,1);
  await page.getByRole('button',{name:'অডিও রেকর্ডিং ব্যবহার করুন'}).click();
  await page.getByRole('button',{name:'রেকর্ডিং থামান'}).waitFor();
  await page.waitForTimeout(50);
  await page.getByRole('button',{name:'রেকর্ডিং থামান'}).click();
  await page.waitForURL('**/marketplace?search=*');
  assert.equal(voiceLanguage,true,'Audio fallback must send the selected language');
  assert.deepEqual(errors,[]);
  console.log('Browser passed: six languages on marketplace, manager, admin and customer pages; Bengali voice search; product confirmation; PCM fallback.');
} finally { await browser.close(); }
