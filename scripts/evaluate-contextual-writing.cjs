const fs = require('node:fs/promises');
const cases = require('./contextual-writing-cases.cjs');
const { loadTS } = require('./load-ts.cjs');
const { readWritingStream } = loadTS('lib/writing-stream.ts');
const { normalizeWritingSuffix, localWritingSuggestion, WRITING_CONSENT_VERSION } = loadTS('lib/writing-suggestions.ts');
async function main() {
  const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3000').origin;
  const rows = [];
  for (const item of cases) {
    const start = performance.now(); let firstWordMs = null, frames = 0;
    const response = await fetch(base + '/api/writing/complete', {method:'POST', headers:{Origin:base,'Content-Type':'application/json',Accept:'application/x-ndjson'}, body:JSON.stringify({prefix:item.prefix, language:item.language,consent:true,consentVersion:WRITING_CONSENT_VERSION}), signal:AbortSignal.timeout(20000)});
    let suffix='', error=null;
    try {
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      suffix = await readWritingStream(response, (text) => {frames++; if (text.trim() && firstWordMs === null) firstWordMs = Math.round(performance.now()-start);}, new AbortController().signal);
    } catch(e) {error=e.message;}
    const valid = !!suffix && normalizeWritingSuffix(item.prefix,suffix) === suffix;
    rows.push({...item,suffix,combined:item.prefix+suffix,firstWordMs,totalMs:Math.round(performance.now()-start),frames,status:response.status,valid,error,localMatch:!!localWritingSuggestion(item.prefix,item.language)});
    console.log(`${rows.length}: ${valid?'OK':'CHECK'}; first=${firstWordMs} ms; ${JSON.stringify(suffix)}`);
  }
  const times=rows.filter(r=>r.firstWordMs!==null).map(r=>r.firstWordMs).sort((a,b)=>a-b);
  const report={date:new Date().toISOString(),base,cases:rows.length,valid:rows.filter(r=>r.valid).length,firstWordMedianMs:times[Math.floor(times.length/2)],firstWordP95Ms:times[Math.ceil(times.length*.95)-1],note:'Real configured-provider requests using synthetic text, including the founder example; manual semantic review is required. Timings exclude the input pause.',rows};
  await fs.writeFile(process.argv[3] ?? 'docs/contextual-writing-evaluation.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({cases:report.cases,valid:report.valid,firstWordMedianMs:report.firstWordMedianMs,firstWordP95Ms:report.firstWordP95Ms}));
  if (report.valid!==report.cases) process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
