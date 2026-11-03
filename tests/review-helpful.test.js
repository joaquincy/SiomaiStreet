import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHelpfulHandler } from '../server/reviewHelpful.js';
import { prepareHelpfulVote, saveHelpfulVote, readHelpfulVote, validHelpfulReceipt } from '../src/utils/reviewHelpful.js';

const id = '11111111-1111-4111-8111-111111111111';
test('Helpful SQL preserves existing totals, deduplicates retries and hides unpublished reviews', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.reviews(id uuid primary key, status text, helpful_count integer not null default 0);
      insert into reviews values ('${id}', 'published', 7);`);
    const sql = await readFile(new URL('../supabase/migrations/20261103000000_review_helpful_votes.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    // Some shared databases never installed the legacy function. Also verify
    // rerunning on older databases revokes its grants without losing votes.
    await db.exec("create function public.increment_review_helpful(uuid) returns integer language sql as 'select 1'; grant execute on function public.increment_review_helpful(uuid) to service_role;");
    await db.exec(sql);
    assert.equal((await db.query("select has_function_privilege('service_role', 'public.increment_review_helpful(uuid)', 'EXECUTE') as allowed")).rows[0].allowed, false);
    const vote = hash => db.query('select record_review_helpful($1,$2) as count', [id, hash]);
    assert.equal((await vote('a'.repeat(64))).rows[0].count, 8);
    assert.equal((await vote('a'.repeat(64))).rows[0].count, 8);
    const results = await Promise.all([vote('b'.repeat(64)), vote('b'.repeat(64)), vote('c'.repeat(64))]);
    assert.equal(results.at(-1).rows[0].count, 10);
    assert.equal((await db.query('select count(*)::int as n from review_helpful_votes')).rows[0].n, 3);
    await db.exec("update reviews set status='rejected'");
    assert.equal((await vote('d'.repeat(64))).rows[0].count, null);
    await db.exec('set role anon');
    await assert.rejects(vote('e'.repeat(64)), /permission denied/);
    await assert.rejects(db.query('select * from review_helpful_votes'), /permission denied/);
  } finally { await db.close(); }
});

test('Helpful handler checks origin and rate before reading a body and returns a strict receipt', async () => {
  let parsed = 0, called = 0, body = { voterId: id }, allowed = true, result = 8;
  const handle = createHelpfulHandler({ json: (_r, status, data) => ({ status, data }),
    rate: async () => allowed, readJson: async () => { parsed++; return body; },
    rpc: async args => { called++; assert.match(args.p_voter_hash, /^[0-9a-f]{64}$/); assert.equal(args.p_review_id,id); return result; } });
  const req = { headers: { origin: 'https://www.siomaistreet.online', host: 'www.siomaistreet.online' } };
  const res = { setHeader() {} };
  assert.equal((await handle({ headers: { ...req.headers, 'sec-fetch-site': 'cross-site' } },res,id)).status,403);
  allowed = false; assert.equal((await handle(req,res,id)).status,429); assert.equal(parsed,0);
  allowed = true; body = { voterId: 'invalid' }; assert.equal((await handle(req,res,id)).status,400); assert.equal(called,0);
  body = { voterId: id }; const good = await handle(req,res,id); assert.ok(validHelpfulReceipt(good.data,id));
  result = null; assert.equal((await handle(req,res,id)).status,404);
  result = -1; assert.equal((await handle(req,res,id)).status,503);
});

test('Helpful retry identity is saved before sending and survives a lost response and refresh', () => {
  const items = new Map(); const storage = { getItem: key => items.get(key) || null, setItem: (key,value) => items.set(key,value) };
  const record = prepareHelpfulVote(storage,id,()=>id);
  assert.deepEqual(prepareHelpfulVote(storage,id,()=>{ throw new Error('must reuse identity'); }),record);
  saveHelpfulVote(storage,id,record);
  assert.equal(readHelpfulVote(storage,id).voted,true);
  assert.throws(()=>prepareHelpfulVote({getItem(){return null;},setItem(){throw new Error('blocked');}},id,()=>id), /blocked/);
  assert.throws(()=>readHelpfulVote({getItem(){return '{broken';}},id));
  assert.equal(validHelpfulReceipt({helpful:8, voted:true, reviewId:'other'},id),false);
  assert.equal(validHelpfulReceipt({helpful:NaN, voted:true, reviewId:id},id),false);
});
