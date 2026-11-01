const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("../scripts/load-ts.cjs");
const { nextTaskMetric, parseTaskMetric } = loadTS("lib/task-metrics.ts");
const { summarizeFunnel } = loadTS("lib/funnel-report.ts");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const since = "2026-10-15T00:00:00Z";
const row = (event, timestamp, extra = {}) => ({ actor_id: "synthetic-person", event, timestamp: `2026-10-${timestamp}:00Z`, ...extra });
const events = [
  row("site_visited", "15T10:00"), row("signup_completed", "15T10:01"),
  row("prompt_generated", "15T10:02", { task_id: "first", result_id: "original", new_task: true }),
  row("prompt_copied", "15T10:03", { task_id: "first", result_id: "edited" }),
  row("prompt_result_confirmed", "15T10:06", { task_id: "first", result_id: "edited", outcome: "useful" }),
  row("prompt_generated", "16T10:00", { task_id: "second", result_id: "second-result", new_task: true }),
  row("purchase_confirmed", "16T10:05", { live_mode: true, event_key: "receipt-one" }),
];

test("tasks have random metadata-only identities, while versions retain the same task", () => {
  const first = nextTaskMetric(null, true);
  assert.deepEqual(parseTaskMetric(first), first);
  const refined = nextTaskMetric(first, false);
  assert.equal(refined.task_id, first.task_id);
  assert.notEqual(refined.result_id, first.result_id);
  assert.notEqual(nextTaskMetric(first, true).task_id, first.task_id);
  for (const invalid of [null, {}, { task_id: "prompt text", result_id: first.result_id }, { ...first, result_id: "x" }]) assert.equal(parseTaskMetric(invalid), null);
});

test("the ordered seven-step funnel counts each person once, despite repeated events", () => {
  const report = summarizeFunnel([...events, ...events].reverse(), since);
  assert.ok(Object.values(report.counts).every(count => count === 1));
  assert.equal(report.day_boundary, "UTC");
  assert.doesNotMatch(JSON.stringify(report), /synthetic-person|receipt-one|original/);
});

test("copying or declining usefulness is never treated as a confirmed useful result", () => {
  for (const outcome of ["not_useful", "not_tried", undefined]) {
    const report = summarizeFunnel(events.map(e => e.event === "prompt_result_confirmed" ? { ...e, outcome } : e), since);
    assert.equal(report.counts.copied_prompt, 1);
    assert.equal(report.counts.useful_result, 0);
    assert.equal(report.counts.purchase, 0);
  }
});

test("a usefulness vote must match the copied task and exact result version", () => {
  for (const extra of [{ task_id: "other-task" }, { result_id: "other-version" }, { actor_id: "other-person" }]) {
    const report = summarizeFunnel(events.map(e => e.event === "prompt_result_confirmed" ? { ...e, ...extra } : e), since);
    assert.equal(report.counts.useful_result, 0);
  }
});

test("same-day new tasks, reopened results, and next-day refinements do not prove next-day retention", () => {
  for (const extra of [{ timestamp: "2026-10-15T11:00:00Z" }, { new_task: false }, { task_id: "first" }]) {
    const report = summarizeFunnel(events.map(e => e.task_id === "second" ? { ...e, ...extra } : e), since);
    assert.equal(report.counts.useful_result, 1);
    assert.equal(report.counts.new_task_later_day, 0);
  }
});

test("test purchases, cancelled checkouts and browser success-screen events do not count as revenue", () => {
  for (const extra of [{ live_mode: false }, { live_mode: undefined }, { event: "checkout_completed" }, { event: "checkout_cancelled" }, { event: "checkout_failed" }]) {
    const report = summarizeFunnel(events.map(e => e.event === "purchase_confirmed" ? { ...e, ...extra } : e), since);
    assert.equal(report.counts.new_task_later_day, 1);
    assert.equal(report.counts.purchase, 0);
  }
});

test("old receipts cannot be moved after a return by replaying their verification event", () => {
  const earlier = row("purchase_confirmed", "15T10:07", { live_mode: true, event_key: "receipt-one" });
  const report = summarizeFunnel([...events, earlier], since);
  assert.equal(report.counts.purchase, 0);
  assert.equal(report.purchases_after_useful_before_return, 1);
});

test("an existing user's new login does not become a new registration", () => {
  const report = summarizeFunnel(events.map(e => e.event === "signup_completed" ? { ...e, timestamp: "2026-09-01T00:00:00Z" } : e), since);
  assert.equal(report.counts.visit, 1);
  assert.equal(report.counts.signup, 0);
});

test("invalid data and out-of-order copies cannot inflate downstream steps", () => {
  const report = summarizeFunnel([...events.map(e => e.event === "prompt_copied" ? { ...e, timestamp: "2026-10-15T09:00:00Z" } : e), { actor_id: "", event: "site_visited", timestamp: "bad" }], since);
  assert.equal(report.counts.generated_prompt, 1);
  assert.equal(report.counts.copied_prompt, 0);
  assert.equal(report.ignored_rows, 1);
  assert.throws(() => summarizeFunnel(events, "bad"));
});

test("conversion is bounded by an explicit reporting window", () => {
  const late = events.map(e => e.event === "purchase_confirmed" ? { ...e, timestamp: "2026-11-15T00:00:00Z" } : e);
  assert.equal(summarizeFunnel(late, since).counts.purchase, 0);
  assert.equal(summarizeFunnel(late, since, 60).counts.purchase, 1);
  assert.throws(() => summarizeFunnel(events, since, 0));
});

test("the report command accepts PostHog JSON exports and prints aggregates without account identifiers", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "umprompt-funnel-"));
  const filename = path.join(directory, "synthetic-events.json");
  try {
    const columns = ["actor_id", "event", "timestamp", "task_id", "result_id", "new_task", "outcome", "live_mode", "event_key"];
    const exported = { columns, results: events.map(row => columns.map(key => typeof row[key] === "boolean" ? String(row[key]) : row[key] ?? null)) };
    fs.writeFileSync(filename, JSON.stringify(exported));
    const result = spawnSync(process.execPath, [path.join(__dirname, "../scripts/report-funnel.cjs"), "--events", filename, "--since", since], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(Object.values(JSON.parse(result.stdout).counts).every(value => value === 1));
    assert.doesNotMatch(result.stdout, /synthetic-person|receipt-one/);
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.unlinkSync(filename);
    fs.rmdirSync(directory);
  }
});
