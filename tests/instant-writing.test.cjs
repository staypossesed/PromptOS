const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('../scripts/load-ts.cjs');
const { writingLanguage, localWritingSuggestion, appendWritingSuggestion, continueWritingSuggestion, nextWritingWord, suggestedWritingWord } = loadTS('lib/writing-suggestions.ts');
const cases = [
  ['help me to write a', 'ru', 'en'], ['help me write a', 'en', 'en'], ['HELP ME TO WRITE A', 'ru', 'en'],
  ['  help  me to write a ', 'en', 'en'], ['please help me to write a', 'ru', 'en'], ['can you help me to write a', 'en', 'en'],
  ['I want to write a', 'es', 'en'], ['I need to write an email', 'en', 'en'], ['help me prepare for the NCLEX', 'ru', 'en'],
  ['help me plan my week', 'en', 'en'], ['Помоги мне написать', 'en', 'ru'], ['Помоги написать пись', 'ru', 'ru'],
  ['Напиши пост', 'en', 'ru'], ['Составь план', 'es', 'ru'], ['Ayudame a escribir un', 'ru', 'es'],
  ['Necesito escribir un', 'en', 'es'], ['Quiero organizar la semana', 'es', 'es'], ['Planifica un viaje', 'ru', 'es'],
  ['Create a chatbot', 'ru', 'en'], ['Write a short post', 'en', 'en'],
];

for (const [prefix, ui, expected] of cases) test(`instant local continuation: ${prefix}`, () => {
  const language = writingLanguage(prefix, ui); assert.equal(language, expected);
  const suffix = localWritingSuggestion(prefix, language); assert.ok(suffix, prefix);
  assert.equal(appendWritingSuggestion(prefix, suffix), prefix + suffix);
});

test('instant completion supports partial words, whitespace, accents, and preserves exact input', () => {
  for (const prefix of ['hel', 'help me to wri', 'help me to write a pol', 'Ayudame a escri', 'Помоги мне написа']) {
    assert.ok(localWritingSuggestion(prefix, writingLanguage(prefix, 'ru')), prefix);
  }
  assert.match(localWritingSuggestion('help me to write a', 'en'), /polite email/);
  assert.equal(localWritingSuggestion('Explain this topic.', 'en'), '');
  assert.equal(localWritingSuggestion('Invented arbitrary text with no clear task', 'en'), '');
});

test('a continuation can advance through its own letters but never through a changed task', () => {
  const suggestion = { prefix: 'Help me organise a workshop for', suffix: ' clear next steps.', source: 'ai' };
  assert.equal(continueWritingSuggestion(suggestion, suggestion.prefix + ' cle').suffix, 'ar next steps.');
  assert.equal(continueWritingSuggestion(suggestion, 'A completely different idea'), null);
  assert.equal(continueWritingSuggestion(suggestion, suggestion.prefix + suggestion.suffix), null);
});

test('the local path has no deliberate wait and stays within an interactive CPU budget', t => {
  // Exercise realistic mixed languages repeatedly; this measures local CPU, not browser paint time.
  const durations = [];
  for (let i = 0; i < 10; i++) for (const [prefix, ui] of cases) {
    const start = performance.now();
    assert.ok(localWritingSuggestion(prefix, writingLanguage(prefix, ui)));
    durations.push(performance.now() - start);
  }
  durations.sort((a,b) => a-b);
  const p95 = durations[Math.ceil(durations.length * .95) - 1];
  t.diagnostic(`200 local predictions; p95 ${p95.toFixed(3)} ms; maximum ${durations.at(-1).toFixed(3)} ms`);
  assert.ok(p95 < 16, `local prediction p95 ${p95} ms exceeds a frame`);
});

module.exports.cases = cases;

const wordCases = [
  ['f', 'ru', 'find'], ['fi', 'ru', 'find'], ['F', 'ru', 'Find'], ['fina', 'ru', 'financial'],
  ['w', 'ru', 'write'], ['h', 'ru', 'help'],
  ['Нужен понятный граф', 'ru', 'график'], ['Помоги отредактировать фотог', 'ru', 'фотографию'],
  ['Мне нужно составить распис', 'ru', 'расписание'], ['Объясни слово финан', 'ru', 'финансовый'],
  ['Necesito un hor', 'es', 'horario'], ['Tengo una duda sobre el presu', 'es', 'presupuesto'],
  ['Quiero escribir un mens', 'es', 'mensaje'], ['Please help me prepare a sched', 'en', 'schedule'],
  ['Can we discuss the bud', 'en', 'budget'], ['Write about a friendlier approa', 'en', 'approach'],
  ['Explain the differ', 'en', 'different'], ['I want to compare these opt', 'en', 'options'],
  ['Please create a checkl', 'en', 'checklist'], ['Help with the next appoint', 'en', 'appointment'],
];
for (const [prefix, ui, expected] of wordCases) test(`word completion outside exact starter sentences: ${prefix}`, () => {
  const suffix = localWritingSuggestion(prefix, writingLanguage(prefix, ui));
  assert.ok(suffix, prefix); assert.equal(suggestedWritingWord(prefix, suffix), expected);
  assert.equal((prefix + nextWritingWord(suffix)).startsWith(prefix), true);
});

test('Tab accepts just the next word, retaining leading boundaries and a space for continued typing', () => {
  assert.equal(nextWritingWord('ind a name for my project.'), 'ind ');
  assert.equal(nextWritingWord(' polite email asking for an update.'), ' polite ');
  assert.equal(nextWritingWord(' email.'), ' email.');
  assert.equal(suggestedWritingWord('hel', 'p me plan my week.'), 'help');
  assert.equal(suggestedWritingWord('Help me', ' plan my week.'), 'plan');
  assert.equal(localWritingSuggestion('An unrelated thought for', 'en'), '');
  assert.equal(localWritingSuggestion('My password is f', 'en'), '');
});
module.exports.wordCases = wordCases;
