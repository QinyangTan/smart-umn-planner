import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

const bundle=await build({entryPoints:['apps/web/app.ts'],bundle:true,write:false,format:'iife',platform:'browser',define:{__SMART_UMN_VERSION__:JSON.stringify(JSON.parse((await import('node:fs')).readFileSync('package.json','utf8')).version)}});
const source=bundle.outputFiles[0].text;
const demoHTML=(await import('node:fs')).readFileSync('apps/web/demo-apas.html','utf8');
const now=new Date().toISOString();
const profile={
 program:{name:'Synthetic CS BS',campus:'UMNTC'},
 degreeCredits:{required:120,completed:90,remaining:30},
 completedCourses:[],inProgressCourses:[],transferCourses:[],additionalPrograms:[],
 syncedAt:now,parserVersion:'test',warnings:[],provenance:{source:'fixture',retrievedAt:now,period:'fixture'},
 requirements:[{id:'tech',label:'Upper division CSCI coursework',status:'incomplete',requiredCredits:3,remainingCredits:3,children:[],coursesUsed:[],rawMetadata:{},rule:{type:'credits',minimum:3,rule:{type:'range',subject:'CSCI',min:5000,max:5999,campus:'UMNTC'}}}]
};
const course={
 institution:'UMNTC',campus:'UMNTC',term:'1273',subject:'CSCI',catalogNumber:'5103',code:'CSCI 5103',
 title:'Operating Systems',description:'fixture',credits:3,prerequisites:'Instructor consent',
 prerequisiteRule:{type:'unknown',sourceText:'Instructor consent',reason:'Standing, consent, grade or other condition requires review'},
 attributes:[],sectionIds:['10001'],equivalents:[],sourceRefs:{},
 provenance:{source:'fixture',retrievedAt:now,period:'1273'}
};
const section={
 classNumber:'10001',sectionNumber:'001',courseCode:'CSCI 5103',institution:'UMNTC',campus:'UMNTC',term:'1273',component:'LEC',credits:3,
 instructors:[],meetings:[{days:['mon'],startTime:'09:00',endTime:'10:00',startDate:'2027-01-20',endDate:'2027-05-05',location:'Test Hall'}],
 capacity:40,enrolled:20,waitlistCapacity:5,waitlistTotal:0,open:true,enrollable:true,instructionMode:'In Person',restrictions:[],
 prerequisiteRule:course.prerequisiteRule,linkedClassNumbers:[],unresolvedLinks:false,scheduleKnown:true,provenance:{source:'fixture',retrievedAt:now,period:'1273'}
};
const evidence=(data:unknown)=>({data,stale:false,provenance:{source:'fixture',retrievedAt:now,period:'1273'},health:{source:'fixture',status:'healthy',checkedAt:now}});
function setup(activeCourse:any=course,activeSection:any=section,activeProfile:any=profile,url='http://127.0.0.1:4317/'){
 const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 Object.assign(w,{CSS:{escape:(s:string)=>s.replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)},matchMedia:()=>({matches:true})});
 w.localStorage.setItem('umn.profile',JSON.stringify(activeProfile));
 w.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input),w.location.href);
  let body:unknown;
  if(url.pathname==='/api/subjects')body={data:[{code:'CSCI',name:'Computer Science'}],stale:false};
  else if(url.pathname==='/api/general-education')body={data:null,stale:false};
  else if(url.pathname==='/api/catalog/CSCI')body={data:[activeCourse],stale:false};
  else if(url.pathname==='/api/course-context/batch'&&init?.method==='POST')body=[{course:evidence(activeCourse),sections:evidence([activeSection]),grades:evidence(null),feedback:evidence(null),community:[]}];
  else if(url.pathname==='/demo-apas.html')return new Response(demoHTML,{status:200,headers:{'content-type':'text/html'}});
 else body={data:[]};
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
 }) as typeof fetch;
 w.eval(source);
 return dom;
}
async function waitFor(check:()=>boolean,timeout=1000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(check())return;await new Promise(r=>setTimeout(r,10));}throw new Error('timed out waiting for web state');}

test('successful Plan build saves a snapshot and updates the footer count immediately',async()=>{
 const activeCourse={...course,code:'CSCI 5123',catalogNumber:'5123',title:'Recommender Systems',prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf',rules:[]},sectionIds:['20001']};
 const activeSection={...section,classNumber:'20001',courseCode:'CSCI 5123',prerequisiteRule:{type:'allOf',rules:[]}};
 const dom=setup(activeCourse,activeSection);
 try{
  const doc=dom.window.document;
  assert.match(doc.querySelector('h1')?.textContent||'',/What should you do next\?/);
  assert.match(doc.querySelector('.advisor-brief')?.textContent||'',/YOUR REGISTRATION ADVISOR/);
  const roadmap=doc.querySelector('.roadmap');assert.equal(roadmap?.tagName,'DETAILS');assert.equal(roadmap?.hasAttribute('open'),false,'roadmap mechanics stay secondary until the student opens them');
  (doc.querySelector('#autobuild') as HTMLElement).click();
  await waitFor(()=>doc.querySelector('.schedule')!==null&&doc.querySelector('#autobuild')?.textContent?.includes('Rebuild my plan')===true);
  assert.match(doc.querySelector('.schedule')?.textContent||'',/CSCI 5123/);
  assert.match(doc.querySelector('.advisor-brief')?.textContent||'',/Prepare 1 course for registration/);
  assert.equal(doc.querySelector('[data-panel="saved"]')?.textContent?.trim(),'Saved plans');
  (doc.querySelector('[data-save="0"]') as HTMLElement).click();
  assert.equal(doc.querySelector('[data-panel="saved"]')?.textContent?.trim(),'Saved plans (1)');
  assert.equal(JSON.parse(dom.window.localStorage.getItem('umn.plans')||'[]').length,1);
 }finally{dom.window.close();}
});

test('Plan explains a completed search that cannot verify any candidate prerequisites',async()=>{
 const dom=setup();
 try{
  const doc=dom.window.document;
  assert.equal(doc.querySelector('.plan-empty h3')?.textContent,'Your week starts here.');
  (doc.querySelector('#autobuild') as HTMLElement).click();
  await waitFor(()=>doc.querySelector('.candidate-list')!==null&&doc.querySelector('#autobuild')?.textContent?.includes('Build my plan')===true);
  const empty=doc.querySelector('.plan-empty[data-plan-state="attempted"]');
  assert.ok(empty,'completed no-result run must render an attempted state');
  assert.equal(empty.querySelector('h3')?.textContent,'No schedule yet.');
  assert.match(empty.textContent||'',/1 APAS-matching current course was found/);
  assert.match(empty.textContent||'',/need prerequisite review/);
  assert.match(doc.querySelector('.candidate-list')?.textContent||'',/CSCI 5103/);
  assert.match(doc.querySelector('.candidate-list summary')?.textContent||'',/0 selected/);
  const diag=doc.querySelector('.plan-diagnosis');assert.ok(diag,'a zero-schedule run explains itself');
  assert.match(diag!.textContent||'',/Why no schedule\?/);assert.match(diag!.querySelector('li.stop')?.textContent||'',/verified prerequisites/);
  assert.match(diag!.textContent||'',/Next:/);
 }finally{dom.window.close();}
});

test('local APAS import closes the dialog and returns focus to the persistent connection control',async()=>{
 const dom=setup(course,section,null);
 try{
  const doc=dom.window.document,w=dom.window as any;
  if(!w.HTMLDialogElement.prototype.showModal)w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  (doc.querySelector('#connection') as HTMLElement).click();
  await waitFor(()=>doc.querySelector('#import')!==null);
  const input=doc.querySelector('#import') as HTMLInputElement;const html=(await import('node:fs')).readFileSync('tests/fixtures/apas-acceptance.html','utf8');
  Object.defineProperty(input,'files',{value:[{text:async()=>html}]});input.dispatchEvent(new w.Event('change'));
  await waitFor(()=>doc.querySelector('#drawer')===null&&/APAS connected/.test(doc.querySelector('#connection')?.textContent||''));
  assert.equal(doc.activeElement?.id,'connection','focus must not be dropped to <body> after the dialog closes');
  const week=doc.querySelector('.week');if(week){assert.equal(week.getAttribute('tabindex'),'0');assert.equal(week.getAttribute('role'),'region');}
 }finally{dom.window.close();}
});

test('demo student loads a clearly labeled synthetic audit through the real parser and can be exited',async()=>{
 const dom=setup(course,section,null);
 try{
  const doc=dom.window.document;
  (doc.querySelector('[data-demo]') as HTMLElement).click();
  await waitFor(()=>doc.querySelector('.demo-banner')!==null);
  assert.match(doc.querySelector('.demo-banner')?.textContent||'',/Synthetic APAS data/);
  assert.match(doc.querySelector('#connection')?.textContent||'',/Demo student/,'header never claims a real APAS connection in demo mode');
  const stored=JSON.parse(dom.window.localStorage.getItem('umn.profile')||'null');
  assert.equal(stored.program.name,'Demo Student · Computer Science BS (synthetic)');
  assert.deepEqual(stored.degreeCredits,{required:120,completed:62,inProgress:4,remaining:54});
  assert.ok(stored.transferCourses.some((c:any)=>c.courseCode==='MATH 1271'),'AP credit is represented as articulated transfer credit');
  const rules=stored.requirements.map((r:any)=>r.rule.type);assert.ok(rules.includes('policy')&&rules.includes('unknown'),'demo keeps review-only structures visible');
  (doc.querySelector('[data-exit-demo]') as HTMLElement).click();
  assert.equal(doc.querySelector('.demo-banner'),null);assert.equal(dom.window.localStorage.getItem('umn.profile'),null);
 }finally{dom.window.close();}
});

test('?demo=1 never overwrites a real local APAS profile',async()=>{
 const dom=setup(course,section,profile,'http://127.0.0.1:4317/?demo=1');
 try{
  const doc=dom.window.document;
  await waitFor(()=>/Demo not loaded/.test(doc.querySelector('#toast')?.textContent||''));
  assert.equal(JSON.parse(dom.window.localStorage.getItem('umn.profile')||'{}').program.name,'Synthetic CS BS');
  assert.equal(doc.querySelector('.demo-banner'),null);assert.equal(dom.window.location.search,'','demo parameter is removed from the address bar');
 }finally{dom.window.close();}
});

test('an outdated stored profile and an outdated extension are called out before planning',async()=>{
 const dom=setup();
 try{
  const doc=dom.window.document,w=dom.window as any;
  const notice=doc.querySelector('.health-notice');assert.ok(notice,'profile parsed by another parser version is flagged');
  assert.match(notice!.textContent||'',/older Smart UMN version/);assert.ok(notice!.querySelector('[data-connect]'),'offers a one-click re-sync');
  w.dispatchEvent(new w.MessageEvent('message',{data:{channel:'smart-umn-extension',type:'READY',payload:{version:'0.10.6'}},origin:w.location.origin,source:w}));
  await waitFor(()=>/extension is out of date/.test(doc.querySelector('.health-notice')?.textContent||''));
  assert.match(doc.querySelector('.health-notice')!.textContent||'',/Installed 0\.10\.6/);
 }finally{dom.window.close();}
});

test('an async re-render keeps text the student is still typing',async()=>{
 const dom=setup();
 try{
  const doc=dom.window.document,w=dom.window as any;
  (doc.querySelector('[data-nav="Explore"]') as HTMLElement).click();
  const q=doc.querySelector('#query') as HTMLInputElement;q.focus();q.value='PSY 10';
  w.dispatchEvent(new w.MessageEvent('message',{data:{channel:'smart-umn-extension',type:'READY',payload:{version:'9.9.9'}},origin:w.location.origin,source:w}));// forces a render
  const after=doc.querySelector('#query') as HTMLInputElement;assert.notEqual(after,q,'the input element was replaced');assert.equal(after.value,'PSY 10');assert.equal(doc.activeElement,after);
 }finally{dom.window.close();}
});

test('an outdated extension is flagged even before any APAS profile is loaded',async()=>{
 const dom=setup(course,section,null);
 try{
  const doc=dom.window.document,w=dom.window as any;assert.equal(doc.querySelector('.health-notice'),null);
  w.dispatchEvent(new w.MessageEvent('message',{data:{channel:'smart-umn-extension',type:'READY',payload:{}},origin:w.location.origin,source:w}));
  await waitFor(()=>/extension is out of date/.test(doc.querySelector('.health-notice')?.textContent||''));
  assert.match(doc.querySelector('.health-notice')!.textContent||'',/before 0\.10\.8/,'bridges that report no version predate 0.10.8');
  assert.equal(doc.querySelector('.health-notice [data-connect]'),null,'no re-sync button without a profile issue');
 }finally{dom.window.close();}
});
