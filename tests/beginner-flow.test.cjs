const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('../scripts/load-ts.cjs');
const load = require('./load-with-imports.cjs');
const { NextRequest, NextResponse } = require('next/server');
const { requestLanguage } = loadTS('lib/i18n/request-language.ts');
const { beginnerCopy, beginnerQuestions } = loadTS('lib/beginner-copy.ts');
const { parseBeginnerDraft } = loadTS('lib/beginner-draft.ts');
const { buildMetaPrompt } = loadTS('lib/ai/generate-prompt.ts');
const context = loadTS('lib/prompt-context.ts');
const { canExpandIdea } = loadTS('lib/prompt-editing.ts');
const languages = loadTS('types/language.ts');

test('first render honors saved choices, regional browser languages, quality ordering and English fallback', () => {
  assert.equal(requestLanguage('ru', 'es-MX,en;q=0.8'), 'ru');
  assert.equal(requestLanguage(null, 'de-DE,es-MX;q=0.9,en;q=0.7'), 'es');
  assert.equal(requestLanguage(null, 'ru;q=0,en-US;q=0.8'), 'en');
  assert.equal(requestLanguage(null, 'en;q=0.2,ru-RU;q=0.9'), 'ru');
  assert.equal(requestLanguage('invalid', 'fr-FR'), 'en');
});
test('all three languages cover the same beginner controls and NCLEX questions do not re-ask a supplied duration', () => {
  for (const language of ['en','ru','es']) {
    const copy = beginnerCopy(language);
    assert.deepEqual(Object.keys(copy), Object.keys(beginnerCopy('en')));
    assert.ok(Object.values(copy).every(value => typeof value !== 'string' || value.trim()));
    const qs = beginnerQuestions(copy.tasks[0].idea, language);
    assert.deepEqual(qs.map(q => q.id), ['exam','studyTime']);
    assert.equal(beginnerQuestions('Prepare me for NCLEX', language).length, 3);
  }
});
test('the study prompt includes a reusable course, progress checkpoints and official exam references', () => {
  const meta = buildMetaPrompt({idea:'Prepare me for the NCLEX over three months',target_tool:'claude',context:{universal:true,delivery:'prompt',clarifications:'NCLEX-RN; one hour a day'}});
  assert.match(meta.system, /one lesson at a time/i); assert.match(meta.system,/checkpoint/i);
  assert.match(meta.system,/https:\/\/www.nclex.com\/test-plans.page/);
  assert.match(meta.system,/do not guarantee passing/i); assert.match(meta.user,/three months/);
});
test('details already supplied in a simple message request are not asked again', () => {
  assert.deepEqual(beginnerQuestions('Write a short thank-you message to a colleague','en'),[]);
  assert.deepEqual(beginnerQuestions('Напиши короткое письмо коллеге','ru'),[]);
  assert.deepEqual(beginnerQuestions('Escribe un mensaje breve a un compañero','es'),[]);
});
test('finished-result mode is separate from prompt writing and excludes unconfirmed profiles and version history', () => {
  const meta=buildMetaPrompt({idea:'Write a thank-you email',target_tool:'claude',context:{universal:true,delivery:'answer',profile:{details:'PRIVATE_PROFILE_MARKER'},versions:[{prompt:'OLD_HISTORY_MARKER'}]}});
  assert.match(meta.system,/Complete the requested task directly/); assert.doesNotMatch(meta.user,/PRIVATE_PROFILE_MARKER|OLD_HISTORY_MARKER/);
  assert.ok(context.parsePromptContext({delivery:'unknown'}).error);
});
test('sign-in drafts preserve the actual result and delivery mode, and reject expired, empty or malformed results', () => {
  const draft={owner:null,idea:'Prepare me for NCLEX',answers:{exam:'NCLEX-RN'},extra:'one hour',delivery:'prompt',result:{idea:'Prepare me for NCLEX',text:'An actual prepared request',context:{universal:true,delivery:'prompt'}},createdAt:Date.now()};
  assert.equal(parseBeginnerDraft(JSON.stringify(draft)).result.text,draft.result.text);
  for(const value of [{...draft,createdAt:Date.now()-3600001},{...draft,result:{...draft.result,text:' '}},{...draft,answers:{exam:4}},{...draft,delivery:'invalid'}])assert.equal(parseBeginnerDraft(JSON.stringify(value)),null);
  assert.equal(loadTS('lib/checkout.ts').checkoutReturn('/?resume=checkout'),'/?resume=checkout');
  assert.equal(loadTS('lib/checkout.ts').checkoutReturn('/?resume=checkout&redirect=evil'),'/dashboard');
});

function guestRoute({hold='allowed',fail=false,text='Prepared instructions'}={}) {
  const calls=[]; const finishes=[]; const reservation={key:'synthetic',token:'synthetic'};
  const route=load('app/api/guest/generate/route.ts',{
    'next/server':{NextResponse},'@/lib/ai/generate-prompt':{generatePromptText:async input=>{calls.push(input);if(fail)throw Error('Synthetic failure');return{text};}},
    '@/lib/prompt-editing':{canExpandIdea},'@/lib/prompt-context':context,'@/types/language':languages,
    '@/lib/guest-access':{guestKey:()=> 'synthetic',reserveGuest:async()=>hold==='allowed'?reservation:hold,finishGuest:async(r,success)=>finishes.push(success)},
  });
  const request=(body={idea:'Prepare me for NCLEX',context:{universal:true,delivery:'prompt'},outputLanguage:'en'},origin='http://localhost')=>new NextRequest('http://localhost/api/guest/generate',{method:'POST',headers:{origin},body:JSON.stringify(body)});
  return{route,calls,finishes,request};
}
test('public generation rejects cross-origin, oversized and accidental inputs before any provider call',async()=>{
  const t=guestRoute();
  assert.equal((await t.route.POST(t.request(undefined,'https://other.invalid'))).status,403);
  assert.equal((await t.route.POST(t.request({idea:'f',outputLanguage:'en'}))).status,422);
  assert.equal((await t.route.POST(t.request({idea:'x'.repeat(17000),outputLanguage:'en'}))).status,422);
  assert.equal(t.calls.length,0);
});
test('guest quota, concurrent requests and provider failures cannot silently consume a successful free try',async()=>{
  for(const hold of ['used','busy']) {const t=guestRoute({hold});const response=await t.route.POST(t.request());assert.equal(response.status,429);assert.equal(t.calls.length,0);assert.equal((await response.json()).error,hold==='used'?'GUEST_LIMIT_REACHED':'GUEST_BUSY');}
  for(const options of [{fail:true},{text:' '}]){const t=guestRoute(options);assert.equal((await t.route.POST(t.request())).status,503);assert.deepEqual(t.finishes,[false]);}
});
test('local host normalization does not block a same-origin guest, while a foreign origin remains blocked', async () => {
  const t=guestRoute();
  const request=new NextRequest('http://localhost/api/guest/generate',{method:'POST',headers:{origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000'},body:JSON.stringify({idea:'Prepare me for NCLEX',outputLanguage:'en'})});
  assert.equal((await t.route.POST(request)).status,200);
  const hostile=new NextRequest('http://localhost/api/guest/generate',{method:'POST',headers:{origin:'https://other.invalid',host:'127.0.0.1:3000'},body:'{}'});
  assert.equal((await t.route.POST(hostile)).status,403);
});
test('a guest receives one bounded result without model overrides, saved history or private profile access',async()=>{
  const t=guestRoute();const response=await t.route.POST(t.request({idea:'Prepare me for NCLEX',outputLanguage:'es',provider:'other',model:'expensive',context:{delivery:'answer',profile:{id:'p',name:'p',details:'PRIVATE_MARKER',audience:'',voice:'',constraints:''},profileConsent:true}}));
  assert.equal(response.status,200);assert.equal((await response.json()).data,'Prepared instructions');assert.deepEqual(t.finishes,[true]);
  assert.equal(t.calls[0].modelOverride,undefined);assert.equal(t.calls[0].context.profile,undefined);assert.equal(t.calls[0].context.delivery,'answer');
});
test('guest reservations block parallel work, release failed work and remember one successful completion',async()=>{
  const old=process.env.NODE_ENV;process.env.NODE_ENV='development';
  try{const access=loadTS('lib/guest-access.ts');const key='test:'+require('node:crypto').randomUUID();const first=await access.reserveGuest(key);assert.equal(await access.reserveGuest(key),'busy');await access.finishGuest(first,false);const retry=await access.reserveGuest(key);assert.equal(typeof retry,'object');await access.finishGuest(retry,true);assert.equal(await access.reserveGuest(key),'used');}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
});
test('production guest access fails closed without trusted deployment headers or distributed storage',async()=>{
  const keys=['NODE_ENV','VERCEL','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try{
    process.env.NODE_ENV='production';delete process.env.VERCEL;delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const access=loadTS('lib/guest-access.ts');assert.throws(()=>access.guestKey(new Headers({'x-forwarded-for':'203.0.113.1'})));
    process.env.VERCEL='1';process.env.UPSTASH_REDIS_REST_TOKEN='synthetic-test-salt';
    assert.throws(()=>access.guestKey(new Headers({'x-vercel-forwarded-for':'not-an-ip'})));
    const key=access.guestKey(new Headers({'x-vercel-forwarded-for':'203.0.113.1'}));assert.ok(!key.includes('203.0.113.1'));
    await assert.rejects(access.reserveGuest(key),/unavailable/);
  }finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
