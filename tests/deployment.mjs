// Run with plain Node against the exact Vercel entry point, without tsx/ts-node.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import mongoose from 'mongoose';

process.env.VERCEL = '1';
delete process.env.MONGODB_URI;
delete process.env.JWT_SECRET;
const { default:app } = await import('../api/index.js');
assert.equal(typeof app,'function');
assert.deepEqual(await readdir(new URL('../api/',import.meta.url)), ['index.js']);
assert.ok(!(await readdir(new URL('../dist/',import.meta.url))).some(name => /^server\./.test(name)),'Server code must not be published as static assets');
const bundle = await readFile(new URL('../build/serverless.mjs',import.meta.url),'utf8');
assert.ok(!/\b(?:from\s*|import\s*\()\s*['"]\.{1,2}\//.test(bundle),'All local imports must be bundled');

const server = app.listen(0,'127.0.0.1');
await new Promise(resolve => server.once('listening',resolve));
const root = `http://127.0.0.1:${server.address().port}/api`;
const connect = mongoose.connect;
try {
  const health = await fetch(`${root}/health`);
  assert.equal(health.status,200);
  assert.equal((await health.json()).configured,false);
  assert.equal((await fetch(`${root}/does-not-exist`)).status,404);
  const missingDB = await fetch(`${root}/products`);
  assert.equal(missingDB.status,503);
  assert.match((await missingDB.json()).message,/environment variables/);
  const malformed = await fetch(`${root}/ai/speak`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad json'});
  assert.equal(malformed.status,400);
  assert.equal((await malformed.json()).message,'Invalid JSON request body');
  for (const language of ['en','hi','bn','ta','te','mr','gu']) {
    const response = await fetch(`${root}/ai/speak`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Hello',language})});
    assert.equal(response.status,200,`Native synthesis must load with plain Node for ${language}`);
    assert.equal(response.headers.get('content-type'),'audio/wav');
    const audio = Buffer.from(await response.arrayBuffer());
    assert.equal(audio.toString('ascii',0,4),'RIFF'); assert.ok(audio.length>44);
  }
  assert.equal((await fetch(`${root}/ai/transcribe-and-intent`,{method:'POST'})).status,400);
  const invalidTranslation = await fetch(`${root}/ai/translate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Hello',targetLang:'invalid'})});
  assert.equal(invalidTranslation.status,400);
  // Simulate connection concurrency without reading or writing a real database.
  process.env.MONGODB_URI='mongodb://deployment-test'; process.env.JWT_SECRET='deployment-test-secret';
  let attempts = 0;
  mongoose.connect = async () => {
    attempts++; mongoose.connection.readyState=2;
    await new Promise(resolve => setTimeout(resolve,40));
    mongoose.connection.readyState=1; return mongoose;
  };
  const requests = await Promise.all([1,2,3].map(() => fetch(`${root}/admin/analytics`)));
  assert.equal(attempts,1,'Cold-start requests share a connection promise');
  requests.forEach(response => assert.equal(response.status,401));
  mongoose.connection.readyState=0;
  mongoose.connect = async () => { throw new Error('Simulated database outage'); };
  assert.equal((await fetch(`${root}/products`)).status,503);
  assert.equal((await fetch(`${root}/products`)).status,503,'Failed connections can be retried');
  console.log('Deployment passed: plain Node ESM entry, bundled local imports, seven speech voices, JSON errors, isolated database failures and concurrent cold starts.');
} finally {
  mongoose.connect = connect; mongoose.connection.readyState=0;
  await new Promise(resolve => server.close(resolve));
}
