import express from 'express';
import assert from 'node:assert/strict';
import { apiRouter } from '../api/routes';
const app = express(); app.use(express.json()); app.use('/api', apiRouter);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening',resolve));
const address = server.address() as { port:number };
const root = `${process.env.SPEECH_TEST_ORIGIN || `http://127.0.0.1:${address.port}`}/api/ai`;
try {
  for (const language of ['en','hi','bn','ta','te','mr','gu']) {
    const response = await fetch(`${root}/speak`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:'Hello',language}) });
    assert.equal(response.status,200, `${language}: speech endpoint failed`);
    assert.equal(response.headers.get('content-type'),'audio/wav');
    const wav = Buffer.from(await response.arrayBuffer());
    assert.equal(wav.toString('ascii',0,4),'RIFF');
  }
  // A synthesized phrase exercises the real endpoint; human accent accuracy
  // must be evaluated separately with microphone recordings.
  const spoken = await fetch(`${root}/speak`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Search for honey.',language:'en'})});
  const form = new FormData(); form.append('audio',new Blob([await spoken.arrayBuffer()],{type:'audio/wav'}),'test.wav'); form.append('language','en');
  const response = await fetch(`${root}/transcribe-and-intent`,{method:'POST',body:form});
  const result = await response.json();
  assert.equal(response.status,200, JSON.stringify(result));
  assert.ok(result.transcript?.trim());
  assert.equal(result.intent?.action,'search_product',JSON.stringify(result));
  assert.match(result.intent?.data?.search,/honey/i);
  console.log('Real HTTP speech round trip passed:', result.transcript);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
