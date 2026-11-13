const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const crypto=require('node:crypto');
async function main(){
  const base='https://www.umprompt.com';
  const expected=JSON.parse(await fs.readFile('public/writing-dictionaries/manifest.json','utf8'));
  const live=await fetch(base+'/writing-dictionaries/manifest.json',{signal:AbortSignal.timeout(20000)});
  assert.equal(live.status,200); assert.deepEqual(await live.json(),expected);
  const checks=[];
  for(const [language,info] of Object.entries(expected.languages)){
    const response=await fetch(base+'/writing-dictionaries/'+info.filename,{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),info.sha256);
    const data=JSON.parse(bytes); assert.equal(data.words.length,info.words); assert.equal(data.language,language);
    checks.push({language,wordForms:data.words.length,status:response.status,sha256:info.sha256});
  }
  const notice=await fetch(base+'/writing-dictionaries/NOTICE.txt',{signal:AbortSignal.timeout(20000)});
  assert.equal(notice.status,200); assert.match(await notice.text(),/CC-BY-SA-4.0/);
  const privacy=await fetch(base+'/privacy',{signal:AbortSignal.timeout(20000)});
  assert.equal(privacy.status,200); assert.match(await privacy.text(),/FrequencyWords/);
  const result={verifiedAt:new Date().toISOString(),base,version:expected.version,passed:true,checks,attributionPublished:true,note:'Live public assets exactly match the audited bytes. Actual UI behavior is recorded separately.'};
  await fs.writeFile(process.argv[2]||'docs/writing-dictionary-live-assets.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
