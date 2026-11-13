const test = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest, NextResponse } = require('next/server');
const { loadTS } = require('../scripts/load-ts.cjs');
const load = require('./load-with-imports.cjs');
const suggestions = loadTS('lib/writing-suggestions.ts');
const languages = loadTS('types/language.ts');
const cases = require('../scripts/writing-evaluation-cases.cjs');

for (const item of cases) test(`writing language ${item.id}: ${item.language} input with ${item.ui} UI`, () => {
  assert.equal(suggestions.writingLanguage(item.prefix, item.ui), item.language);
  assert.equal(suggestions.eligibleWritingPrefix(item.prefix), true);
});

test('local examples append characters without replacing the original or requiring AI', () => {
  for (const [prefix, language] of [['Write a polite', 'en'], ['Помоги написать', 'ru'], ['Ayúdame a escribir', 'es'], ['Explain this', 'en'], ['Составь план', 'ru'], ['Planifica mi', 'es']]) {
    const suffix = suggestions.localWritingSuggestion(prefix, language);
    assert.ok(suffix, prefix); assert.equal(suggestions.appendWritingSuggestion(prefix, suffix), prefix + suffix);
  }
  assert.ok(suggestions.localWritingSuggestion('I need', 'en'));
});

test('unsafe, long, repeated, or fact-inventing continuations are suppressed', () => {
  const prefix = 'Help me plan an ordinary task with';
  for (const suffix of ['\nnew line', ' x'.repeat(80), ' a budget of 500 dollars', ' [your private address]', '<script>', ' https://example.com', ' Here is the answer', ' Help me plan an ordinary task with more details']) assert.equal(suggestions.normalizeWritingSuffix(prefix, suffix), '', suffix);
  assert.equal(suggestions.normalizeWritingSuffix('Plan a trip with a budget of 300', ' and keep the total below 300.'), ' and keep the total below 300.');
  assert.equal(suggestions.appendWritingSuggestion('x'.repeat(3999), ' more'), null);
});

test('apparent credentials and identifiers stop suggestions on both paths', () => {
  for (const prefix of ['My password is synthetic-secret-value', 'Write to person@example.com about', 'The number is 123-45-6789 and', 'My card is 4242 4242 4242 4242 and', 'Use sk_live_SYNTHETIC_ONLY_NOT_A_KEY to']) {
    assert.equal(suggestions.sensitiveWritingText(prefix), true, prefix); assert.equal(suggestions.localWritingSuggestion(prefix, 'en'), ''); assert.equal(suggestions.eligibleWritingPrefix(prefix), false);
  }
  assert.equal(suggestions.sensitiveWritingText('Write a password reset email for a colleague'), false);
});

test('old responses and disabled suggestions cannot become editable user text', () => {
  const old = { prefix: 'Help me write', suffix: ' a short email.', source: 'ai' };
  assert.equal(suggestions.currentWritingSuggestion(old, 'Help me study', true), null);
  assert.equal(suggestions.currentWritingSuggestion(old, old.prefix, false), null);
  assert.equal(suggestions.currentWritingSuggestion(old, old.prefix, true), old);
});

test('a finished sentence does not trigger another unsolicited cloud continuation', () => {
  for (const prefix of ['Help me write a clear email.', 'Помоги спланировать неделю!', '¿Puedes explicarlo?']) assert.equal(suggestions.eligibleWritingPrefix(prefix), false);
  assert.equal(suggestions.eligibleWritingPrefix('Help me write a clear email, with'), true);
});

function setup(options = {}) {
  const calls = []; const limits = [];
  const route = load('app/api/writing/complete/route.ts', {
    'next/server': { NextRequest, NextResponse }, '@/lib/writing-suggestions': suggestions, '@/types/language': languages,
    '@/lib/ai/complete-writing': { completeWriting: async (...args) => { calls.push(args); if (options.onCall) return options.onCall(...args); if (options.fail) throw Error('provider detail must not leak'); return ' useful examples.'; } },
    '@/lib/guest-access': { guestKey: () => { if (options.storageFailure) throw Error('storage'); return 'keyed-synthetic-network'; } },
    '@/lib/rate-limit': { rateLimit: async (_, action) => { limits.push(action); return { allowed: !options.limited }; } },
  });
  const body = { prefix: 'Explain this topic in simple words with', language: 'en', consent: true, consentVersion: suggestions.WRITING_CONSENT_VERSION };
  const request = (extra = {}, init = {}) => new NextRequest('https://umprompt.com/api/writing/complete', { method: 'POST', headers: { Origin: 'https://umprompt.com', 'Content-Type': 'application/json', ...(init.headers ?? {}) }, body: JSON.stringify({ ...body, ...extra }) });
  return { ...route, calls, limits, request, body };
}

test('consent and same-origin checks happen before any provider call or usage limit', async () => {
  for (const override of [{ consent: false }, { consent: undefined }, { consentVersion: 0 }, { consentVersion: 1 }]) {
    const s = setup(); const r = await s.POST(s.request(override)); assert.equal(r.status, 403); assert.deepEqual(s.calls, []); assert.deepEqual(s.limits, []);
  }
  const s = setup(); assert.equal((await s.POST(s.request({}, { headers: { Origin: 'https://other.example' } }))).status, 403); assert.deepEqual(s.calls, []);
});

test('request size, language, context and model overrides are rejected', async () => {
  for (const extra of [{ prefix: 'x'.repeat(4001) }, { language: 'xx' }, { model: 'expensive' }, { context: { private: 'not transmitted' } }]) {
    const s = setup(); assert.equal((await s.POST(s.request(extra))).status, 422); assert.deepEqual(s.calls, []);
  }
  const s = setup(); const oversized = new NextRequest('https://umprompt.com/api/writing/complete', { method: 'POST', headers: { Origin: 'https://umprompt.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s.body, prefix: 'я'.repeat(8000) }) }); assert.equal((await s.POST(oversized)).status, 422);
});

test('private and insufficient inputs do not reach the model or consume an allowance', async () => {
  for (const [prefix, reason] of [['Email person@example.com to', 'private'], ['', 'short']]) {
    const s = setup(); const r = await s.POST(s.request({ prefix })); assert.equal(r.status, 200); assert.equal((await r.json()).reason, reason); assert.deepEqual(s.calls, []); assert.deepEqual(s.limits, []);
  }
});

test('completion has separate limits and no-store output; no generation reservation is imported', async () => {
  const s = setup(); const r = await s.POST(s.request()); assert.equal(r.status, 200); assert.match(r.headers.get('cache-control'), /no-store/);
  assert.deepEqual(s.limits, ['writing_burst', 'writing_daily']); assert.equal(s.calls.length, 1); assert.equal(s.calls[0][0], s.body.prefix); assert.equal(s.calls[0][1], 'en'); assert.ok(s.calls[0][2] instanceof AbortSignal);
  assert.equal((await r.json()).source, 'ai');
});

test('rate limits, provider failures and missing distributed protection leave typing independent', async () => {
  const limited = setup({ limited: true }); assert.equal((await limited.POST(limited.request())).status, 429); assert.deepEqual(limited.calls, []);
  for (const options of [{ fail: true }, { storageFailure: true }]) { const s = setup(options); const r = await s.POST(s.request()); assert.equal(r.status, 503); assert.deepEqual(await r.json(), { error: 'SUGGESTIONS_UNAVAILABLE' }); }
});

test('streaming sends a useful word before the final provider result and closes cleanly', async () => {
  let finish;
  const hold = new Promise(resolve => {finish=resolve;});
  const s=setup({onCall:async(_prefix,_language,_signal,progress)=>{progress(' useful');await hold;return ' useful examples.';}});
  const response=await s.POST(s.request({}, {headers:{Accept:'application/x-ndjson'}}));
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/ndjson/);
  const reader=response.body.getReader();
  const first=JSON.parse(new TextDecoder().decode((await reader.read()).value));
  assert.deepEqual(first,{data:' useful',source:'ai',done:false});
  finish();const last=JSON.parse(new TextDecoder().decode((await reader.read()).value));
  assert.equal(last.done,true);assert.equal((await reader.read()).done,true);
});

test('cancelling a streaming reader aborts the provider request', async () => {
  let release;
  const s=setup({onCall:async(_prefix,_language,signal,progress)=>{
    progress(' useful');await new Promise(resolve=>{release=resolve;signal.addEventListener('abort',resolve,{once:true});});return ' useful examples.';
  }});
  const response=await s.POST(s.request({}, {headers:{Accept:'application/x-ndjson'}}));
  const reader=response.body.getReader();await reader.read();await reader.cancel();
  assert.equal(s.calls[0][2].aborted,true);release();
});

test('the entire 4,000-character idea can be completed and a single-letter prefix is eligible',async()=>{
  for(const prefix of ['f','a'.repeat(4000)]) {const s=setup();assert.equal((await s.POST(s.request({prefix}))).status,200);assert.equal(s.calls[0][0],prefix);}
});
