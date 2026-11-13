const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadTS}=require('../scripts/load-ts.cjs');
const lex=loadTS('lib/writing-lexicon.ts');
const writing=loadTS('lib/writing-suggestions.ts');
const root=path.resolve(__dirname,'..');
const read=language=>JSON.parse(fs.readFileSync(path.join(root,'public','writing-dictionaries',`${language}-${lex.WRITING_DICTIONARY_VERSION}.json`),'utf8'));

test('every deployed dictionary entry and every distinct proper prefix passes the actual local path',()=>{
  const report=require('../scripts/audit-writing-dictionaries.cjs').audit(root);
  assert.equal(report.passed,true,JSON.stringify(report.failures.slice(0,10)));
  assert.ok(report.totalWords>140000); assert.ok(report.totalDistinctPrefixes>200000);
});
test('the reported math-class sentence completes immediately with AI off',()=>{
  const dictionary=lex.parseWritingDictionary(read('en'),'en');
  for(const prefix of ['i want to prepare for an exam for my math c','i want to prepare for an exam for my math cl','i want to prepare for an exam for my math cla']){
    const suffix=writing.localWritingSuggestion(prefix,'en',dictionary);
    assert.equal(writing.suggestedWritingWord(prefix,suffix),'class.');
    assert.equal(writing.appendWritingSuggestion(prefix,suffix),prefix+suffix);
  }
});
test('large dictionaries complete unfamiliar vocabulary beyond task templates',()=>{
  for(const [language,input] of [['en','Zeta photosynt'],['en','Zeta mitochond'],['ru','Zeta фотосинт'],['ru','Помоги обсудить переплан'],['ru','Объясни слово каузаль'],['es','Zeta fotosínt'],['es','Explica la causal']]){
    const dictionary=lex.parseWritingDictionary(read(language),language);
    const suffix=writing.localWritingSuggestion(input,language,dictionary);
    assert.ok(suffix,input); assert.equal(writing.appendWritingSuggestion(input,suffix),input+suffix);
  }
});
test('dictionary assets are fetched without draft, cookies or account information and reused',async()=>{
  const before=globalThis.fetch, calls=[];
  globalThis.fetch=async(...args)=>{calls.push(args); return{ok:true,json:async()=>read('en')};};
  try{
    const [a,b]=await Promise.all([lex.loadWritingDictionary('en'),lex.loadWritingDictionary('en')]);
    assert.equal(a,b); assert.equal(await lex.loadWritingDictionary('en'),a); assert.equal(calls.length,1);
    assert.equal(calls[0][0],`/writing-dictionaries/en-${lex.WRITING_DICTIONARY_VERSION}.json`);
    assert.deepEqual(calls[0][1],{credentials:'omit',cache:'force-cache'});
  }finally{globalThis.fetch=before;}
});
test('failed dictionary downloads can retry; invalid or wrong-language data is rejected',async()=>{
  const before=globalThis.fetch; let calls=0;
  globalThis.fetch=async()=>{calls++; return calls===1?{ok:false}:{ok:true,json:async()=>read('es')};};
  try{await assert.rejects(lex.loadWritingDictionary('es')); assert.ok(await lex.loadWritingDictionary('es')); assert.equal(calls,2);}finally{globalThis.fetch=before;}
  for(const bad of [null,{...read('en'),version:'old'},{...read('en'),language:'ru'},{...read('en'),words:['test']}]) assert.throws(()=>lex.parseWritingDictionary(bad,'en'));
});
