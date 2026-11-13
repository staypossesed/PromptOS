const fs = require('node:fs/promises');
const path = require('node:path');
const cases = require('./writing-evaluation-cases.cjs');
const { loadTS } = require('./load-ts.cjs');
const { writingLanguage, normalizeWritingSuffix, WRITING_CONSENT_VERSION } = loadTS('lib/writing-suggestions.ts');

async function main() {
  const index = process.argv.indexOf('--base-url');
  const base = index < 0 ? 'http://localhost:3000' : process.argv[index + 1];
  const origin = new URL(base).origin;
  const outputIndex = process.argv.indexOf('--output');
  const output = outputIndex < 0 ? path.resolve('docs/writing-evaluation.json') : path.resolve(process.argv[outputIndex + 1]);
  if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ cases, origin }, null, 2)); return; }
  const rows = [];
  for (const item of cases) {
    const language = writingLanguage(item.prefix, item.ui);
    const started = performance.now();
    let result;
    try {
      const response = await fetch(origin + '/api/writing/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ prefix: item.prefix, language, consent: true, consentVersion: WRITING_CONSENT_VERSION }), signal: AbortSignal.timeout(20000),
      });
      const json = await response.json();
      const suffix = typeof json.data === 'string' ? json.data : '';
      result = { ...item, detectedLanguage: language, status: response.status, source: json.source, suffix, combined: item.prefix + suffix,
        structurallyValid: response.ok && json.source === 'ai' && !!suffix && normalizeWritingSuffix(item.prefix, suffix) === suffix && language === item.language,
        error: json.error ?? json.reason ?? null, latencyMs: Math.round(performance.now() - started) };
    } catch (error) { result = { ...item, structurallyValid: false, error: error.name, latencyMs: Math.round(performance.now() - started) }; }
    rows.push(result);
    console.error(`Case ${item.id}: ${result.structurallyValid ? 'valid' : 'CHECK'} (${result.latencyMs} ms)`);
  }
  const times = rows.filter(r => r.structurallyValid).map(r => r.latencyMs).sort((a, b) => a - b);
  const report = { evaluatedAt: new Date().toISOString(), endpoint: origin + '/api/writing/complete', cases: rows.length,
    structurallyValid: rows.filter(r => r.structurallyValid).length, medianLatencyMs: times[Math.floor(times.length / 2)] ?? null,
    p95LatencyMs: times[Math.min(times.length - 1, Math.ceil(times.length * .95) - 1)] ?? null,
    reviewNote: 'These are 20 synthetic real-provider HTTP requests. Structural checks are automated; read every continuation against its criterion before reporting semantic success. Latency includes HTTP and rate limiting, not the UI pause. This is not a guarantee for every future request.', rows };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cases: report.cases, structurallyValid: report.structurallyValid, medianLatencyMs: report.medianLatencyMs, p95LatencyMs: report.p95LatencyMs, output }));
  if (rows.some(r => !r.structurallyValid)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
