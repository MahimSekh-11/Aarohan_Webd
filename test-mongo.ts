import { MongoMemoryServer } from 'mongodb-memory-server';

async function test() {
  try {
    console.log('starting...');
    const m = await MongoMemoryServer.create();
    console.log('success', m.getUri());
  } catch(e) {
    console.error('error', e);
  }
}
test();
