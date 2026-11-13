const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-with-imports.cjs");
const tagged = "?utm_source=reddit&utm_medium=community&utm_campaign=first_useful_result&utm_content=alphaandbetausers&token=PRIVATE";

test("only the reviewed invitation resolves; arbitrary campaign values never enter analytics", () => {
  const a = load("lib/analytics.ts", {"posthog-js": {default:{}}});
  assert.deepEqual(a.resolveAcquisition(tagged, null, 100), {id:"reddit_first_task_alpha",capturedAt:100});
  assert.equal(a.resolveAcquisition("?utm_source=private@email.invalid&utm_campaign=PRIVATE",null,100),null);
  assert.equal(a.resolveAcquisition(tagged.replace("community","email"),null,100),null);
  assert.deepEqual(a.analyticsProperties({acquisition_id:"PRIVATE", prompt:"PRIVATE"}),{});
});

test("known attribution survives navigation, expires after 24h and rejects corrupt or future state", () => {
  const a = load("lib/analytics.ts", {"posthog-js": {default:{}}});
  assert.deepEqual(a.resolveAcquisition("",{id:"reddit_first_task_alpha",capturedAt:100},101),{id:"reddit_first_task_alpha",capturedAt:100});
  for (const stored of [{id:"PRIVATE",capturedAt:100},{id:"reddit_first_task_alpha",capturedAt:200},{id:"reddit_first_task_alpha",capturedAt:NaN}]) assert.equal(a.resolveAcquisition("",stored,101),null);
  assert.equal(a.resolveAcquisition("",{id:"reddit_first_task_alpha",capturedAt:100},100+86400000),null);
});

test("visit through useful result retains the safe acquisition id and matching result identifiers", () => {
  const previousWindow=global.window,previousKey=process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const values=new Map(),calls=[];
  global.window={location:{search:tagged},sessionStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
  process.env.NEXT_PUBLIC_POSTHOG_KEY="synthetic-project-token";
  try {
    const a=load("lib/analytics.ts",{"posthog-js":{default:{capture:(...args)=>calls.push(args),reset:()=>{}}}});
    a.track("site_visited");
    window.location.search="";
    a.analyticsReady();
    a.track("task_started");
    const metric={task_id:"synthetic-task",result_id:"synthetic-result"};
    a.track("prompt_generated",{...metric,new_task:true});
    a.track("prompt_copied",metric);
    a.track("prompt_result_confirmed",{...metric,outcome:"useful"});
    assert.equal(calls.length,5);
    for(const call of calls) assert.equal(call[1].acquisition_id,"reddit_first_task_alpha");
    assert.equal(calls[2][1].task_id,calls[4][1].task_id);
    assert.equal(calls[2][1].result_id,calls[4][1].result_id);
    assert.doesNotMatch(JSON.stringify(calls)+JSON.stringify([...values]),/PRIVATE|utm_|token=/);
    a.resetAnalytics();assert.equal(values.size,0);
  } finally {if(previousWindow===undefined)delete global.window;else global.window=previousWindow;if(previousKey===undefined)delete process.env.NEXT_PUBLIC_POSTHOG_KEY;else process.env.NEXT_PUBLIC_POSTHOG_KEY=previousKey;}
});

test("blocked browser storage never crashes tracking",()=>{
 const previousWindow=global.window,previousKey=process.env.NEXT_PUBLIC_POSTHOG_KEY;const calls=[];
 global.window={location:{search:tagged},sessionStorage:{getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')},removeItem:()=>{throw Error('blocked')}}};
 process.env.NEXT_PUBLIC_POSTHOG_KEY='synthetic-project-token';
 try{const a=load('lib/analytics.ts',{'posthog-js':{default:{capture:(...args)=>calls.push(args)}}});a.analyticsReady();assert.doesNotThrow(()=>a.track('site_visited'));assert.equal(calls[0][1].acquisition_id,'reddit_first_task_alpha');}
 finally{if(previousWindow===undefined)delete global.window;else global.window=previousWindow;if(previousKey===undefined)delete process.env.NEXT_PUBLIC_POSTHOG_KEY;else process.env.NEXT_PUBLIC_POSTHOG_KEY=previousKey;}
});
