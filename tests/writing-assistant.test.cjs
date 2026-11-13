const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const load = require('./load-with-imports.cjs');
const { loadTS } = require('../scripts/load-ts.cjs');
const suggestions = loadTS('lib/writing-suggestions.ts');
const stream = loadTS('lib/writing-stream.ts');
const { useWritingSuggestions } = load('hooks/useWritingSuggestions.ts', { react: React, '@/lib/writing-suggestions': suggestions, '@/lib/writing-stream': stream, '@/lib/writing-lexicon': {loadWritingDictionary:async()=>null} });
const events = [];
const { WritingAssistant } = load('components/builder/writing-assistant.tsx', {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
  'next/link': { default: props => React.createElement('a', props, props.children) },
  'lucide-react': Object.fromEntries(['Check', 'Sparkles', 'Undo2', 'X'].map(name => [name, () => null])),
  '@/hooks/useWritingSuggestions': { useWritingSuggestions }, '@/lib/writing-suggestions': suggestions,
  '@/lib/analytics': { track: (...args) => events.push(args) },
});
const sleep = ms => act(() => new Promise(resolve => setTimeout(resolve, ms)));
const remotePrefix = 'Help me outline a ceramics workshop:';
const storageKey = `umprompt:writing-consent:v${suggestions.WRITING_CONSENT_VERSION}`;

test('writing assistant interaction regression checks (isolated React renderer, no browser)', async t => {
  const originals = Object.fromEntries(['fetch', 'sessionStorage', 'document', 'requestAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  const stored = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) } });
  globalThis.document = { execCommand: () => false };
  globalThis.requestAnimationFrame = callback => { callback(); return 0; };

  function mount({ value = remotePrefix, language = 'en', owner = 'guest', fetcher } = {}) {
    stored.clear(); events.length = 0;
    const calls = [];
    globalThis.fetch = (...args) => { calls.push(args); return fetcher ? fetcher(...args) : Promise.resolve({ ok: true, status: 200, json: async () => ({ data: ' clear next steps.', source: 'ai' }) }); };
    let renderer, setValue;
    let current = value;
    let currentOwner = owner;
    const node = { value, selectionStart: value.length, selectionEnd: value.length, offsetWidth: 400, clientWidth: 400, scrollTop: 0,
      focus() {}, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } };
    function Controlled() {
      const [text, update] = React.useState(value);
      current = text; node.value = text; setValue = update;
      return React.createElement(WritingAssistant, { id: 'test-idea', value: text, onChange: update, language, owner: currentOwner, placeholder: 'Your idea' });
    }
    act(() => { renderer = create(React.createElement(Controlled), { createNodeMock: element => element.type === 'textarea' ? node : { scrollTop: 0 } }); });
    const textarea = () => renderer.root.findByType('textarea');
    const byClass = name => renderer.root.findByProps({ className: name });
    const allClass = name => renderer.root.findAllByProps({ className: name });
    const enabled = () => byClass('writing-controls').props['data-writing-mode'] === 'ai';
    return { calls, node, renderer, textarea, byClass, allClass, enabled, value: () => current,
      focus: () => act(() => textarea().props.onFocus()),
      change: next => act(() => { node.value = next; node.setSelectionRange(next.length, next.length); textarea().props.onChange({ target: node }); }),
      click: name => act(() => byClass(name).props.onClick()),
      toggle: () => act(() => byClass('writing-enable').props.onClick()),
      owner: next => act(() => { currentOwner = next; renderer.update(React.createElement(Controlled)); }),
      unmount: () => act(() => renderer.unmount()),
    };
  }

  await t.test('local suggestion never sends text; accepts only explicitly and Undo restores exact input', async () => {
    const h = mount({ value: 'Write a polite' });
    try {
      h.focus();
      assert.equal(h.calls.length, 0); assert.equal(h.enabled(), false);
      assert.equal(h.value(), 'Write a polite'); assert.equal(h.allClass('writing-suggestion').length, 1);
      for (const button of h.renderer.root.findAllByType('button')) assert.equal(button.props.type, 'button');
      h.click('writing-accept'); assert.match(h.value(), /^Write a polite email/);
      assert.equal(h.allClass('writing-suggestion').length, 1);
      assert.deepEqual(events[0], ['idea_suggestion_selected', { source: 'typing_local', language: 'en', inputLanguage: 'en' }]);
      act(() => h.byClass('writing-added').findByType('button').props.onClick());
      assert.equal(h.value(), 'Write a polite'); assert.equal(h.calls.length, 0);
    } finally { h.unmount(); }
  });

  await t.test('the visible enable button opens a disclosure but does not grant consent or transmit text', async () => {
    const h = mount();
    try {
      h.focus(); h.toggle(true); await sleep(750);
      assert.equal(h.allClass('writing-consent').length, 1); assert.equal(h.enabled(), false);
      assert.equal(h.calls.length, 0); assert.equal(stored.size, 0);
      h.click('writing-allow'); await sleep(750);
      assert.equal(h.calls.length, 1); assert.equal(h.calls[0][0], '/api/writing/complete');
      const options = h.calls[0][1];
      assert.deepEqual(JSON.parse(options.body), { prefix: remotePrefix, language: 'en', consent: true, consentVersion: suggestions.WRITING_CONSENT_VERSION });
      assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
      assert.equal(stored.get(storageKey), `${suggestions.WRITING_CONSENT_VERSION}:guest`); assert.equal(h.value(), remotePrefix);
      assert.equal(h.allClass('writing-suggestion').length, 1);
    } finally { h.unmount(); }
  });

  await t.test('opting out aborts an in-flight request and ignores its late response', async () => {
    let finish;
    const h = mount({ fetcher: () => new Promise(resolve => { finish = resolve; }) });
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); await sleep(750);
      assert.equal(h.calls.length, 1); h.toggle(false);
      assert.equal(h.calls[0][1].signal.aborted, true); assert.equal(stored.size, 0);
      await act(async () => { finish({ ok: true, status: 200, json: async () => ({ data: ' stale private suggestion.' }) }); });
      assert.equal(h.allClass('writing-suggestion').length, 0); assert.equal(h.value(), remotePrefix);
    } finally { h.unmount(); }
  });

  await t.test('editing while a request is running cannot restore the old suggestion', async () => {
    let finish;
    const h = mount({ fetcher: () => new Promise(resolve => { finish = resolve; }) });
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); await sleep(750);
      h.change('A different unfinished task with');
      await act(async () => { finish({ ok: true, status: 200, json: async () => ({ data: ' the old continuation.' }) }); });
      assert.equal(h.allClass('writing-suggestion').length, 0);
      assert.equal(h.value(), 'A different unfinished task with'); assert.equal(h.calls[0][1].signal.aborted, true);
    } finally { h.unmount(); }
  });

  await t.test('IME composition and a caret in the middle suppress requests', async () => {
    const h = mount();
    try {
      h.focus(); h.toggle(true); h.click('writing-allow');
      act(() => h.textarea().props.onCompositionStart()); await sleep(750); assert.equal(h.calls.length, 0);
      act(() => { h.node.setSelectionRange(2, 2); h.textarea().props.onCompositionEnd(); });
      await sleep(750); assert.equal(h.calls.length, 0);
      act(() => { h.node.setSelectionRange(remotePrefix.length, remotePrefix.length); h.textarea().props.onSelect(); });
      await sleep(750); assert.equal(h.calls.length, 1);
    } finally { h.unmount(); }
  });

  await t.test('Enter and Shift-Tab keep normal behavior; Escape dismisses without editing', async () => {
    const h = mount({ value: 'Write a polite' });
    try {
      h.focus(); await sleep(450); let prevented = 0;
      for (const key of ['Tab', 'Enter']) act(() => h.textarea().props.onKeyDown({ key, shiftKey: key === 'Tab', nativeEvent: {}, preventDefault: () => prevented++ }));
      assert.equal(prevented, 0); assert.equal(h.value(), 'Write a polite');
      act(() => h.textarea().props.onKeyDown({ key: 'Escape', nativeEvent: {}, preventDefault: () => prevented++ }));
      assert.equal(prevented, 1); assert.equal(h.allClass('writing-suggestion').length, 0);
    } finally { h.unmount(); }
  });

  await t.test('the founder screenshot phrase shows a suggestion in the same render, without consent or a wait', () => {
    const h = mount({ value: 'help me to write a', language: 'ru' });
    try {
      h.focus(); assert.equal(h.allClass('writing-suggestion').length, 1); assert.equal(h.calls.length, 0);
      assert.equal(h.value(), 'help me to write a');
      assert.equal(h.byClass('writing-accept').findByType('strong').children.join(''), 'polite');
      let prevented = 0;
      act(() => h.textarea().props.onKeyDown({ key: 'Tab', nativeEvent: {}, preventDefault: () => prevented++ }));
      assert.equal(prevented, 1); assert.equal(h.value(), 'help me to write a polite ');
      assert.equal(h.byClass('writing-accept').findByType('strong').children.join(''), 'email');
      act(() => h.textarea().props.onKeyDown({ key: 'z', ctrlKey: true, nativeEvent: {}, preventDefault() {} }));
      assert.equal(h.value(), 'help me to write a');
    } finally { h.unmount(); }
  });

  await t.test('a local preview follows character-by-character typing immediately and never triggers fetch', () => {
    const h = mount({ value: '', language: 'ru' });
    try {
      h.focus();
      for (const prefix of ['hel', 'help', 'help me', 'help me to', 'help me to wri', 'help me to write', 'help me to write a', 'help me to write a pol']) {
        h.change(prefix); assert.equal(h.allClass('writing-suggestion').length, 1, prefix); assert.equal(h.value(), prefix);
      }
      assert.equal(h.calls.length, 0); assert.equal(h.enabled(), false);
    } finally { h.unmount(); }
  });

  await t.test('one letter in a Russian UI shows an inline word and repeated Tab advances word by word', () => {
    const h = mount({ value: 'f', language: 'ru' });
    try {
      h.focus(); assert.equal(h.byClass('writing-accept').findByType('strong').children.join(''), 'find');
      assert.match(h.byClass('writing-ghost-suffix').children.join(''), /^ind/);
      assert.equal(h.byClass('writing-suggestion').findByType('p').props.className, 'sr-only');
      for (const expected of ['find ', 'find a ', 'find a name ']) {
        act(() => h.textarea().props.onKeyDown({ key: 'Tab', nativeEvent: {}, preventDefault() {} }));
        assert.equal(h.value(), expected);
      }
      assert.equal(h.calls.length, 0);
      h.change('f'); h.click('writing-accept-all'); assert.match(h.value(), /^find a name for my project/);
      assert.equal(h.allClass('writing-suggestion').length, 0);
    } finally { h.unmount(); }
  });

  await t.test('an AI continuation is reused instantly as the user types into it', async () => {
    const h = mount();
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); await sleep(400);
      assert.equal(h.calls.length, 1); assert.equal(h.allClass('writing-suggestion').length, 1);
      h.change(remotePrefix + ' cle');
      assert.equal(h.allClass('writing-suggestion').length, 1);
      assert.equal(h.byClass('writing-accept').findByType('strong').children.join(''), 'clear');
      await sleep(350); assert.equal(h.calls.length, 1);
    } finally { h.unmount(); }
  });

  await t.test('changing account revokes tab consent', async () => {
    const h = mount();
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); h.owner('another-user');
      await sleep(750); assert.equal(h.enabled(), false); assert.equal(stored.size, 0); assert.equal(h.calls.length, 0);
    } finally { h.unmount(); }
  });

  await t.test('sensitive text is blocked locally even after consent', async () => {
    const h = mount({ value: 'Write to private@example.com about' });
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); await sleep(750);
      assert.equal(h.calls.length, 0); assert.equal(h.allClass('writing-suggestion').length, 0);
      assert.match(h.byClass('writing-status').children.join(''), /private identifiers/);
    } finally { h.unmount(); }
  });

  await t.test('rate limiting pauses new cloud calls while local help and text editing remain available', async () => {
    const h = mount({ fetcher: async () => ({ ok: false, status: 429 }) });
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); await sleep(750);
      assert.equal(h.calls.length, 1); h.change(remotePrefix + ' useful'); await sleep(1300);
      assert.equal(h.calls.length, 1); assert.match(h.byClass('writing-status').children.join(''), /resting/);
      h.change('Write a polite'); await sleep(450);
      assert.equal(h.allClass('writing-suggestion').length, 1); assert.equal(h.textarea().props.disabled, false);
    } finally { h.unmount(); }
  });

  await t.test('network errors do not change text or disable the input', async () => {
    const h = mount({ fetcher: async () => { throw Error('synthetic offline'); } });
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); await sleep(750);
      assert.equal(h.value(), remotePrefix); assert.equal(h.textarea().props.disabled, false);
      assert.match(h.byClass('writing-status').children.join(''), /unavailable/);
    } finally { h.unmount(); }
  });

  await t.test('AI runs even when an offline dictionary match exists', async () => {
    const h = mount({ value: 'Help me plan my week' });
    try {
      h.focus(); assert.equal(h.calls.length, 0); h.toggle(true); h.click('writing-allow'); await sleep(350);
      assert.equal(h.calls.length, 1); assert.equal(h.byClass('writing-suggestion').props['data-writing-source'], 'ai');
      assert.equal(h.calls[0][1].headers.Accept, 'application/x-ndjson');
    } finally { h.unmount(); }
  });

  await t.test('turning AI off keeps basic local completion available', async () => {
    const h = mount({ value: 'f' });
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); h.toggle(false);
      assert.equal(h.enabled(), false); assert.equal(h.byClass('writing-suggestion').props['data-writing-source'], 'local');
    } finally { h.unmount(); }
  });

  await t.test('empty AI results and long inputs have an explicit status instead of silent failure', async () => {
    const h = mount({ fetcher: async () => ({ ok:true, status:200, json:async()=>({data:'',source:'ai'}) }) });
    try {
      h.focus(); h.toggle(true); h.click('writing-allow'); await sleep(350);
      assert.match(h.byClass('writing-status').children.join(''), /No useful continuation/);
      h.change('A'.repeat(4001)); assert.match(h.byClass('writing-status').children.join(''), /4,000/);
      assert.equal(h.textarea().props.disabled,false);
    } finally { h.unmount(); }
  });
});
