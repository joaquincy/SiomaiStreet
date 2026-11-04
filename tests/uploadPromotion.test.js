import test from 'node:test';
import assert from 'node:assert/strict';
import { createUploadStorage } from '../server/directUploadServices.js';

const file = new File(['%PDF-1.4 synthetic'], 'test.pdf', { type: 'application/pdf' });
test('new private documents promote without an existence lookup or download', async () => {
  let uploads = 0;
  const storage = createUploadStorage({ url: 'https://synthetic.invalid', serviceKey: 'private',
    uploadFile: async (bucket, path, value) => { uploads++; assert.equal(bucket, 'franchise-documents'); assert.equal(path, 'direct/test'); assert.equal(value, file); },
    fetcher: async () => assert.fail('Fresh promotion must not query storage first'),
  });
  await storage.promote('direct/test', file); assert.equal(uploads, 1);
});

test('lost promotion responses and conflicts reuse only exactly matching private bytes', async () => {
  for (const status of [0, 409]) {
    const calls = [];
    const storage = createUploadStorage({ url: 'https://synthetic.invalid', serviceKey: 'private',
      uploadFile: async () => { throw Object.assign(new Error('Synthetic upload failure'), { status }); },
      fetcher: async url => { calls.push(url); return url.includes('/info/') ? Response.json({}) : new Response(file); },
    });
    await storage.promote('direct/test', file);
    assert.equal(calls.length, 2);
  }
});

test('missing or different private documents cannot be treated as a successful promotion', async () => {
  for (const exists of [false, true]) {
    const storage = createUploadStorage({ url: 'https://synthetic.invalid', serviceKey: 'private',
      uploadFile: async () => { throw new Error('Synthetic upload failure'); },
      fetcher: async url => url.includes('/info/') ? Response.json({}, { status: exists ? 200 : 404 }) : new Response('different bytes'),
    });
    await assert.rejects(storage.promote('direct/test', file), exists ? /mismatch/ : /Synthetic upload failure/);
  }
});
