const test = require('node:test');
const assert = require('node:assert/strict');
const {loadTS}=require('../scripts/load-ts.cjs');
const {parseWorkspaceItem}=loadTS('lib/workspace.ts');
const {parsePromptContext,modelContext}=loadTS('lib/prompt-context.ts');
const {dailyTaskKind,usefulNextTask,parseRoutineSettings,recordStudySession}=loadTS('lib/daily-tasks.ts');
const {dailyCopy}=loadTS('lib/daily-copy.ts');
const {isClassicBuilderRoute}=loadTS('lib/builder-route.ts');
const settings={answers:{exam:'NCLEX-RN',studyTime:'About 1 hour'},extra:'Simple language',language:'en',progress:'Practised priorities; review delegation',completedSessions:0};

test('beginner routes open saved tasks while established checkout, pack and template routes remain intact',()=>{
 for(const query of ['id=abc','routine=abc','profile=abc','playbook=abc','task=study','fresh=1',''])assert.equal(isClassicBuilderRoute(new URLSearchParams(query)),false);
 for(const query of ['resume=checkout','profile=abc&resume=checkout','id=abc&resume=checkout','pack=abc','mode=pack','template=abc'])assert.equal(isClassicBuilderRoute(new URLSearchParams(query)),true);
});

test('frequent tasks retain explicitly saved answers and checkpoints without copying profiles or old results',()=>{
 const profile={id:'test',name:'Private',details:'PROFILE_MARKER',audience:'',voice:'',constraints:''};
 const result=parseWorkspaceItem({kind:'playbook',name:'Study',payload:{idea:'Prepare me for NCLEX',routine:settings,context:{universal:true,delivery:'prompt',preferences:{answers:{tone:'private'},extra:'not implicitly reused',language:'en'},profile,profileConsent:true}}});
 assert.deepEqual(result.data.payload.routine,settings);assert.deepEqual(result.data.payload.context,{universal:true,delivery:'prompt'});
 for(const routine of [{...settings,completedSessions:-1},{...settings,progress:'x'.repeat(1201)},{...settings,answers:{__proto__:'bad',unknown:'bad'}},{...settings,language:'xx'},{...settings,lastCompletedAt:'invalid'}])assert.ok(parseWorkspaceItem({kind:'playbook',name:'Study',payload:{idea:'Prepare',context:{},routine}}).error);
});
test('task preferences validate for saved work but are excluded from AI metadata; profile confirmation remains mandatory',()=>{
 const preferences={answers:settings.answers,extra:settings.extra,language:'en'};
 const parsed=parsePromptContext({delivery:'prompt',preferences});assert.deepEqual(parsed.data.preferences,preferences);
 assert.deepEqual(modelContext(parsed.data),{delivery:'prompt'});
 assert.ok(parsePromptContext({preferences:{...preferences,answers:{exam:3}}}).error);
 assert.ok(parsePromptContext({preferences:[]}).error);
});
test('study checkpoints count one explicitly completed session per local day and never infer completion from a save',()=>{
 const first=recordStudySession(settings,true,new Date('2026-11-01T15:00:00Z'));assert.equal(first.completedSessions,1);
 assert.equal(recordStudySession(first,true,new Date('2026-11-01T16:00:00Z')).completedSessions,1);
 assert.equal(recordStudySession(first,false,new Date('2026-11-02T16:00:00Z')).completedSessions,1);
 assert.equal(recordStudySession(first,true,new Date('2026-11-02T16:00:00Z')).completedSessions,2);
 assert.equal(settings.completedSessions,0);
});
test('next tasks use actual goal and user notes without claiming access to an external conversation',()=>{
 for(const language of ['en','ru','es']){
 const c=dailyCopy(language);const study=usefulNextTask('Prepare me for NCLEX',language,settings.progress);
 assert.equal(study.label,c.nextStudy);assert.ok(study.idea.includes(settings.progress));assert.ok(study.idea.includes(c.needsTopic));
 assert.ok(usefulNextTask('Write an email',language).idea.includes(c.needsReply));
 assert.ok(usefulNextTask('Plan my week',language).idea.includes(c.needsChanges));
 assert.ok(usefulNextTask('x'.repeat(4000),language,'y'.repeat(1200)).idea.length<=4000);
 assert.deepEqual(Object.keys(c),Object.keys(dailyCopy('en')));
 }
 for(const idea of ['Prepare for EGE','Подготовка к ЕГЭ','NCLEX','estudiar para un examen'])assert.equal(dailyTaskKind(idea),'study');
 assert.equal(dailyTaskKind('write an email'),'email');
});
