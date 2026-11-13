const test=require('node:test');
const assert=require('node:assert/strict');
const {loadTS}=require('../scripts/load-ts.cjs');
const {readWritingStream}=loadTS('lib/writing-stream.ts');
const load=require('./load-with-imports.cjs');
const suggestions=loadTS('lib/writing-suggestions.ts');

function response(chunks) {
  return new Response(new ReadableStream({start(c){for(const text of chunks)c.enqueue(new TextEncoder().encode(text));c.close();}}),{headers:{'content-type':'application/x-ndjson'}});
}
test('stream updates arrive before final completion, including split Unicode frames',async()=>{
  const parts=[];
  const body=response(['{"data":" в контексте","source":"ai","done":false}\n{"da','ta":" в контексте статьи.","source":"ai","done":true}\n']);
  const final=await readWritingStream(body,(data,done)=>parts.push({data,done}),new AbortController().signal);
  assert.equal(parts.length,2);assert.equal(parts[0].done,false);assert.equal(parts[1].done,true);assert.equal(final,' в контексте статьи.');
});
test('malformed, truncated, provider-error and oversized streams fail explicitly',async()=>{
  for(const chunks of [['not json\n'],['{"data":" partial","source":"ai","done":false}\n'],['{"error":"SUGGESTIONS_UNAVAILABLE","done":true}\n'],['x'.repeat(17000)]]) {
    await assert.rejects(readWritingStream(response(chunks),()=>{},new AbortController().signal));
  }
});
test('an aborted request never publishes late chunks',async()=>{
  const abort=new AbortController();abort.abort();let called=false;
  await assert.rejects(readWritingStream(response(['{"data":" late","source":"ai","done":true}\n']),()=>{called=true;},abort.signal));assert.equal(called,false);
});
test('provider selection stays within the configured recipient and publishes only whole words',async()=>{
  for(const [provider,prefix,fast] of [['anthropic','Explain this unfamiliar topic with',false],['anthropic','f',true],['openrouter','f',false]]){
    const registrations=[];let passed;
    const fakeFactory=()=>({synthetic:true});
    const api=load('lib/ai/complete-writing.ts',{
      ai:{jsonSchema:x=>x,streamObject:options=>{passed=options;return {object:Promise.resolve({suffix:' clear explanations.'}),partialObjectStream:(async function*(){yield {suffix:' cl'};yield {suffix:' clear exp'};yield {suffix:' clear explanations.'};})()};}},
      '@/lib/ai/config':{resolveModel:()=>({provider,config:{factory:fakeFactory}})},
      '@/lib/ai/providers':{getModelConfig:id=>{registrations.push(id);return {factory:fakeFactory};}},
      '@/lib/writing-suggestions':suggestions,
    });
    const updates=[];assert.equal(await api.completeWriting(prefix,'en',new AbortController().signal,text=>updates.push(text)),' clear explanations.');
    assert.deepEqual(updates,[' clear']);assert.deepEqual(registrations,fast?['claude-haiku-4-5']:[]);
    assert.equal(passed.experimental_telemetry.isEnabled,false);assert.equal(passed.maxRetries,0);
  }
});

test('word-finishing output cannot attach an invented personal clause',()=>{
  assert.equal(suggestions.normalizeContextualWriting('a physiother','apist about my treatment plan'),'apist');
  assert.equal(suggestions.normalizeContextualWriting('старой рукоп','иси, которая была утеряна'),'иси');
  assert.equal(suggestions.normalizeContextualWriting('старой рукоп','isi'), '');
  assert.equal(suggestions.normalizeContextualWriting('meaning of logory',' in the supplied text.'),' in the supplied text.');
});
