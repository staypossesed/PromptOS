export interface FunnelRow {
  actor_id: string;
  event: string;
  timestamp: string;
  task_id?: string;
  result_id?: string;
  new_task?: boolean;
  outcome?: string;
  live_mode?: boolean;
  event_key?: string;
}

export const FUNNEL_STEPS = ["visit", "signup", "generated_prompt", "copied_prompt", "useful_result", "new_task_later_day", "purchase"] as const;

// Aggregate metadata exports only. Never include email, prompt text, or account IDs in the output.
export function summarizeFunnel(rows: FunnelRow[], since: string, windowDays = 30) {
  const start = Date.parse(since);
  if (!Number.isFinite(start) || !Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) throw new Error("A valid cohort start and a 1-365 day reporting window are required.");
  const end = start + windowDays * 86400000;
  const counts = Object.fromEntries(FUNNEL_STEPS.map(step => [step, 0])) as Record<typeof FUNNEL_STEPS[number], number>;
  const actors = new Map<string, (FunnelRow & { time: number })[]>();
  let ignored = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") { ignored++; continue; }
    const time = Date.parse(row.timestamp);
    if (typeof row.actor_id !== "string" || !row.actor_id || !Number.isFinite(time)) { ignored++; continue; }
    if (time >= end) continue;
    const events = actors.get(row.actor_id) ?? [];
    events.push({ ...row, time });
    actors.set(row.actor_id, events);
  }
  let earlyPurchasers = 0;
  for (const events of actors.values()) {
    events.sort((a, b) => a.time - b.time);
    const visit = events.find(e => e.event === "site_visited" && e.time >= start);
    if (!visit) continue;
    counts.visit++;
    // An old account signing in again must not become a new signup cohort.
    const signup = events.find(e => e.event === "signup_completed");
    if (!signup || signup.time < visit.time || signup.time < start) continue;
    counts.signup++;
    const generated = events.filter(e => e.event === "prompt_generated" && e.new_task === true && e.task_id && e.time >= signup.time);
    if (!generated.length) continue;
    counts.generated_prompt++;
    const copies = events.filter(e => e.event === "prompt_copied" && e.result_id && generated.some(g => g.task_id === e.task_id && g.time <= e.time));
    if (!copies.length) continue;
    counts.copied_prompt++;
    const useful = events.find(e => e.event === "prompt_result_confirmed" && e.outcome === "useful" && copies.some(c => c.task_id === e.task_id && c.result_id === e.result_id && c.time <= e.time));
    if (!useful) continue;
    counts.useful_result++;
    const returnTask = generated.find(g => g.task_id !== useful.task_id && g.time > useful.time && new Date(g.time).toISOString().slice(0, 10) > new Date(useful.time).toISOString().slice(0, 10));
    // Use the earliest verification per receipt, not a later browser reload/retry.
    const receipts = new Map<string, number>();
    for (const e of events) if (e.event === "purchase_confirmed" && e.live_mode === true && e.event_key && !receipts.has(e.event_key)) receipts.set(e.event_key, e.time);
    const purchased = [...receipts.values()];
    if (purchased.some(time => time >= useful.time && (!returnTask || time < returnTask.time))) earlyPurchasers++;
    if (!returnTask) continue;
    counts.new_task_later_day++;
    if (purchased.some(time => time >= returnTask.time)) counts.purchase++;
  }
  return { cohort_since: new Date(start).toISOString(), window_ends_at: new Date(end).toISOString(), day_boundary: "UTC", counts, purchases_after_useful_before_return: earlyPurchasers, ignored_rows: ignored };
}

// Guest-first acquisition: signup may happen after a useful result, and buying
// does not require a later-day visit. Keep the legacy signup-first report above.
export function summarizeGuestFunnel(rows: (FunnelRow & {action_type?:string; is_internal?:boolean})[], since: string, windowDays=30) {
 const start=Date.parse(since); if(!Number.isFinite(start)||!Number.isInteger(windowDays)||windowDays<1||windowDays>365)throw Error("Invalid cohort window");
 const end=start+windowDays*86400000;
 const counts={visit:0,task_started:0,generated:0,copied:0,useful:0,signup:0,returned_later_day:0,purchased:0,purchased_after_useful:0};
 const actors=new Map<string,((typeof rows)[number]&{time:number})[]>();
 const excluded=new Set(rows.filter(r=>r?.is_internal===true).map(r=>r.actor_id));
 for(const row of rows){if(!row||typeof row.actor_id!=="string"||!row.actor_id||excluded.has(row.actor_id))continue;const time=Date.parse(row.timestamp);if(!Number.isFinite(time)||time>=end)continue;const events=actors.get(row.actor_id)??[];events.push({...row,time});actors.set(row.actor_id,events);}
 for(const events of actors.values()){
  events.sort((a,b)=>a.time-b.time);const visit=events.find(e=>e.event==="site_visited"&&e.time>=start);if(!visit)continue;counts.visit++;
  const active=events.filter(e=>e.time>=visit.time);
  const results=active.filter(e=>e.event==="prompt_generated"&&e.task_id&&e.result_id);
  const generated=results.filter(e=>e.new_task===true);
  if(active.some(e=>e.event==="task_started"))counts.task_started++;
  if(generated.length)counts.generated++;
  const copies=active.filter(e=>e.event==="prompt_copied"&&e.result_id&&generated.some(g=>g.task_id===e.task_id&&g.time<=e.time));if(copies.length)counts.copied++;
  const useful=active.find(e=>e.event==="prompt_result_confirmed"&&e.outcome==="useful"&&results.some(g=>g.task_id===e.task_id&&g.time<=e.time&&(g.action_type==="answer"&&g.result_id===e.result_id||copies.some(c=>c.task_id===e.task_id&&c.result_id===e.result_id&&c.time<=e.time))));if(useful)counts.useful++;
  const signup=events.find(e=>e.event==="signup_completed");if(signup&&signup.time>=visit.time)counts.signup++;
  if(useful&&generated.some(g=>g.task_id!==useful.task_id&&g.time>useful.time&&new Date(g.time).toISOString().slice(0,10)>new Date(useful.time).toISOString().slice(0,10)))counts.returned_later_day++;
  const receipts=new Map<string,number>();for(const event of events)if(event.event==="purchase_confirmed"&&event.live_mode===true&&event.event_key&&!receipts.has(event.event_key))receipts.set(event.event_key,event.time);
  const purchases=[...receipts.values()].filter(time=>time>=visit.time);if(purchases.length)counts.purchased++;if(useful&&purchases.some(time=>time>=useful.time))counts.purchased_after_useful++;
 }
 return {cohort_since:new Date(start).toISOString(),window_ends_at:new Date(end).toISOString(),counts,excluded_internal_actors:excluded.size,signup_order:"optional; may follow result",revenue_source:"Verified live receipts only; reconcile monetary totals with Stripe"};
}
