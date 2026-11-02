const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('../scripts/load-ts.cjs');
const load = require('./load-with-imports.cjs');
const { NextRequest, NextResponse } = require('next/server');
const { beginnerQuestions } = loadTS('lib/beginner-copy.ts');
const { dailyTaskKind, parseRoutineSettings } = loadTS('lib/daily-tasks.ts');
const { parseIdeaQuestions, answeredQuestions } = loadTS('lib/idea-questions.ts');
const { parsePromptContext } = loadTS('lib/prompt-context.ts');
const { parseBeginnerDraft } = loadTS('lib/beginner-draft.ts');
const { canExpandIdea } = loadTS('lib/prompt-editing.ts');
const languages = loadTS('types/language.ts');
const investorIdea = 'Помоги заставить чат оценить работоспособность моего вебсайта и дать оценку как ангел инвестор который будет спонсировать его в будущем, что доделать и тд чтобы я получил миллионы от инвесторов';
const question = {question:'На каком этапе находится ваш сайт?',options:['Идея или прототип','Есть пользователи','Есть платящие клиенты']};

test('investor and chatbot tasks do not become studying because of получил, оценить or generic preparation', () => {
 for (const idea of [investorIdea, 'Помоги подготовить сайт для инвестора', 'Help me prepare a chatbot for customer support', 'Подготовь чат-бота для ответов покупателям']) {
   assert.notEqual(dailyTaskKind(idea),'study');
   assert.ok(!beginnerQuestions(idea,'ru').some(q=>['level','studyTime','timeframe'].includes(q.id)));
 }
 for (const idea of ['Prepare me for NCLEX','Подготовка к ЕГЭ','Изучаю математику','Quiero estudiar para un examen']) assert.equal(dailyTaskKind(idea),'study');
});

test('adaptive questions reject malformed, duplicate, excessive and oversized suggestions; zero questions is valid', () => {
 assert.equal(parseIdeaQuestions([question])[0].label,question.question);
 assert.deepEqual(parseIdeaQuestions([]),[]);
 for (const value of [null,{},[question,question],[question,question,question],[{...question,question:'x'.repeat(181)}],[{...question,options:['one']}],[{...question,options:['same','same']}],[{...question,question:'bad\nquestion'}],[{...question,options:[2,'valid']}]]) assert.equal(parseIdeaQuestions(value),null);
});

test('selected and custom answers remain tied to the exact question through drafts, context, and saved preferences', () => {
 const q=parseIdeaQuestions([question])[0];const answers={[q.id]:'Мой вариант: рабочий сайт, 115 регистраций'};
 const settings={answers,extra:'Проверить воронку оплаты',language:'ru',progress:'',completedSessions:0};
 assert.deepEqual(parseRoutineSettings(settings).answers,answers);
 assert.equal(answeredQuestions(answers)[0].label,question.question);
 assert.equal(answeredQuestions(answers)[0].options[0],answers[q.id]);
 const preferences={answers,extra:settings.extra,language:'ru'};
 assert.deepEqual(parsePromptContext({preferences}).data.preferences,preferences);
 const draft={idea:investorIdea,answers,extra:'',delivery:'prompt',result:null,createdAt:Date.now()};
 assert.deepEqual(parseBeginnerDraft(JSON.stringify(draft)).answers,answers);
 assert.equal(parseRoutineSettings({...settings,answers:{unknown:'bad'}}),null);
});

function routeCase({allowed=true,fail=false}={}) {
 const calls=[]; const rates=[];
 const route=load('app/api/guest/clarify/route.ts',{
  'next/server':{NextResponse},
  '@/lib/ai/clarify-idea':{clarifyIdea:async(...args)=>{calls.push(args);if(fail)throw Error('synthetic');return[question];}},
  '@/lib/guest-access':{guestKey:()=> 'hashed-guest'},
  '@/lib/rate-limit':{rateLimit:async(...args)=>{rates.push(args);return{allowed};}},
  '@/lib/prompt-editing':{canExpandIdea},'@/types/language':languages,
 });
 const request=(body={idea:investorIdea,outputLanguage:'ru'},origin='http://localhost')=>new NextRequest('http://localhost/api/guest/clarify',{method:'POST',headers:{origin},body:JSON.stringify(body)});
 return {route,calls,rates,request};
}

test('guest clarification rejects cross-origin, oversized, invalid-language and too-short input before spending AI tokens',async()=>{
 const t=routeCase();
 assert.equal((await t.route.POST(t.request(undefined,'https://other.invalid'))).status,403);
 for(const body of [{idea:'f',outputLanguage:'ru'},{idea:investorIdea,outputLanguage:'xx'},{idea:'x'.repeat(17000),outputLanguage:'ru'}]) assert.equal((await t.route.POST(t.request(body))).status,422);
 assert.equal(t.calls.length,0);assert.equal(t.rates.length,0);
});

test('guest questions have their own quota, ignore model/private-context overrides and never reserve a free result',async()=>{
 const t=routeCase();const response=await t.route.POST(t.request({idea:investorIdea,outputLanguage:'ru',provider:'other',context:{profile:{details:'PRIVATE'}}}));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(t.rates,[['hashed-guest','guest_clarify']]);
 assert.deepEqual(t.calls[0].slice(0,4),[investorIdea,'auto','ru',{universal:true}]);
 const limited=routeCase({allowed:false});assert.equal((await limited.route.POST(limited.request())).status,429);assert.equal(limited.calls.length,0);
 const failed=routeCase({fail:true});assert.equal((await failed.route.POST(failed.request())).status,503);
});

test('a restored draft keeps the original selectable options and rejects a corrupted question snapshot',()=>{
 const questions=parseIdeaQuestions([question]);const base={idea:investorIdea,answers:{[questions[0].id]:'Свой подробный ответ'},extra:'',delivery:'prompt',result:null,questions,createdAt:Date.now()};
 assert.deepEqual(parseBeginnerDraft(JSON.stringify(base)).questions,questions);
 assert.equal(parseBeginnerDraft(JSON.stringify({...base,questions:[{...questions[0],id:'detail:wrong'}]})),null);
});
