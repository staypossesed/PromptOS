const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const load=require('./load-with-imports.cjs');
const {loadTS}=require('../scripts/load-ts.cjs');
const {PromptContent}=load('extension/src/prompt-content.tsx',{react:React,'react/jsx-runtime':require('react/jsx-runtime')});
const render=text=>renderToStaticMarkup(React.createElement(PromptContent,{text}));
test('premium extension copy covers English, Russian and Spanish without missing controls',()=>{
  const {premiumCopy}=loadTS('extension/src/premium-copy.ts');
  const keys=Object.keys(premiumCopy('en')).sort();
  for(const language of ['en','ru','es']){
    const copy=premiumCopy(language); assert.deepEqual(Object.keys(copy).sort(),keys);
    for(const value of Object.values(copy)) assert.ok(typeof value==='string' && value.trim());
  }
});
test('prompt display formats headings, emphasis, code and ordered/unordered lists without changing source',()=>{
  const source='## Goal\nWrite a **polite email**.\n\n- Keep it short\n- Use `placeholders`\n\n1. Ask\n2. Explain';
  const html=render(source);
  assert.match(html,/<h3>Goal<\/h3>/); assert.match(html,/<strong>polite email<\/strong>/);
  assert.match(html,/<code>placeholders<\/code>/); assert.match(html,/<ul>/); assert.match(html,/<ol>/);
  assert.ok(source.includes('**polite email**'));
});
test('provider HTML, scripts and remote links remain inert text',()=>{
  const html=render('<img src=x onerror=alert(1)>\n<script>alert(1)</script>\n\n[Click](https://unrelated.example)');
  assert.ok(!/<(?:img|script|iframe|a)\b/u.test(html));
  assert.match(html,/&lt;script&gt;/); assert.match(html,/unrelated\.example/);
});
test('incomplete streamed formatting and code fences remain readable and inert',()=>{
  for(const source of ['## In progress\n**unfinished','```html\n<script>doNotExecute()</script>','first\nsecond\n\n---\nlast']){
    const html=render(source); assert.ok(html); assert.ok(!html.includes('<script>'));
  }
});
