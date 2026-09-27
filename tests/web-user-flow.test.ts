import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

const bundle=await build({entryPoints:['apps/web/app.ts'],bundle:true,write:false,format:'iife',platform:'browser'});
const source=bundle.outputFiles[0].text;
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
function setup(activeCourse:any=course,activeSection:any=section,activeProfile:any=profile){
 const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://127.0.0.1:4317/',runScripts:'outside-only',pretendToBeVisual:true});
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
 }finally{dom.window.close();}
});
