const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = 'https://www.umprompt.com';

async function main() {
  const checks = [];
  for (const [language, label] of [['en', 'Enable AI autocomplete'], ['ru', 'Включить ИИ-автодополнение'], ['es', 'Activar autocompletado con IA']]) {
    const response = await fetch(base + '/', { headers: { 'Accept-Language': language }, signal: AbortSignal.timeout(20000) });
    const html = await response.text();
    assert.equal(response.status, 200); assert.ok(html.includes(label), language + ' writing control');
    assert.ok(html.includes('data-writing-mode="local"'));
    checks.push({ check: 'localized homepage; visible activation; AI initially off', language, status: response.status });
  }
  const privacy = await fetch(base + '/privacy', { signal: AbortSignal.timeout(20000) });
  const disclosure = await privacy.text();
  assert.equal(privacy.status, 200); assert.ok(disclosure.includes('id="writing-suggestions"'));
  checks.push({ check: 'published privacy disclosure', status: privacy.status });
  const input = { prefix: 'Explain this topic in simple words with', language: 'en', consent: true, consentVersion: 2 };
  const cases = [
    { name: 'missing consent rejected', origin: base, body: { ...input, consent: false }, status: 403 },
    { name: 'foreign origin rejected', origin: 'https://unrelated.example', body: input, status: 403 },
    { name: 'private context override rejected', origin: base, body: { ...input, context: { synthetic: 'excluded' } }, status: 422 },
    { name: 'apparent private identifier suppressed', origin: base, body: { ...input, prefix: 'Email synthetic@example.com about' }, status: 200, reason: 'private' },
  ];
  for (const item of cases) {
    const response = await fetch(base + '/api/writing/complete', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: item.origin }, body: JSON.stringify(item.body), signal: AbortSignal.timeout(20000) });
    const json = await response.json(); assert.equal(response.status, item.status, item.name);
    if (item.reason) { assert.equal(json.reason, item.reason); assert.equal(json.data, ''); }
    assert.match(response.headers.get('cache-control'), /no-store/);
    checks.push({ check: item.name, status: response.status });
  }
  const result = { verifiedAt: new Date().toISOString(), base, passed: checks.length, checks, limitation: 'HTTP checks only; not a visual browser or native undo test.' };
  if (process.argv[2]) await fs.writeFile(process.argv[2], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
