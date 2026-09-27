import{test}from'node:test';
import assert from'node:assert/strict';
import{JSDOM}from'jsdom';
import{Store}from'../packages/providers/store.ts';
import{ScheduleBuilderProvider}from'../packages/providers/index.ts';
import{degreeDiscoveryPlan,discoverDegreeCandidates,eligibility,sortCoursesForProfile}from'../packages/core/rules.ts';
import{parseAPAS}from'../packages/apas-parser/index.ts';
import{subjectCode}from'../packages/schemas/index.ts';
import type{Course,StudentAcademicProfile}from'../packages/schemas/index.ts';

const now='2026-09-27T02:20:00.000Z';
const profile:StudentAcademicProfile={
 program:{name:'Synthetic CS BS'},degreeCredits:{required:120,completed:60,remaining:60},
 completedCourses:[{courseCode:'CSCI 4041',subject:'CSCI',number:'4041',credits:4,grade:'A',status:'completed'}],
 inProgressCourses:[],transferCourses:[],
 requirements:[{id:'r1',label:'Technical electives',status:'incomplete',requiredCredits:6,appliedCredits:0,inProgressCredits:0,remainingCredits:6,coursesUsed:[],children:[],rule:{type:'credits',minimum:6,rule:{type:'anyOf',rules:[{type:'range',subject:'CSCI',min:4000,max:5999},{type:'course',code:'MATH 4242'}]}},rawMetadata:{}}],
 syncedAt:now,parserVersion:'fixture',warnings:[],provenance:{source:'fixture',retrievedAt:now,period:'fixture'}
};
function course(code:string,title=code):Course{const[subject,catalogNumber]=code.split(' ');return{institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,title,description:'fixture',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf',rules:[]},attributes:[],sectionIds:['1'],equivalents:[],sourceRefs:{},provenance:{source:'fixture',retrievedAt:now,period:'1273'}};}

test('APAS selectable wildcard flows from semantic DOM into local subject discovery',()=>{
 const dom=new JSDOM(`<body><div id="audit"><div class="card-header"><h2>Computer Science BSCompSc</h2><span>Catalog Year Fall 2024</span></div><div class="requirement Status_NO" rname="TECH" rqdhours="6"><div class="reqTitle">CS Technical Electives</div><div class="selectcourses"><span class="course" department="1CSCI" number="5XXX">CSCI 5XXX</span></div></div></div></body>`);
 const parsed=parseAPAS(dom.window.document),plan=degreeDiscoveryPlan(parsed);assert.deepEqual(plan,{explicitCodes:[],subjects:['CSCI'],attributes:[]});assert.equal(parsed.requirements[0].rule.type,'credits');dom.window.close();
});

test('degree discovery expands supported APAS range rules locally without sending the profile',()=>{
 const plan=degreeDiscoveryPlan(profile);
 assert.deepEqual(plan,{explicitCodes:['MATH 4242'],subjects:['CSCI'],attributes:[]});
 const found=discoverDegreeCandidates([course('CSCI 5302'),course('CSCI 4041'),course('CSCI 2033'),course('MATH 4242')],profile);
 assert.deepEqual(found.map(c=>c.code),['MATH 4242','CSCI 5302']);
});

test('courses with an empty proven prerequisite rule say No prerequisites',()=>{
 const c=course('CSCI 1133');
 assert.deepEqual(eligibility(c,profile),{result:'yes',reason:'No prerequisites'});
});

test('Explore sorts each subject through the imported APAS without hiding unrelated courses',()=>{
 const p:StudentAcademicProfile={...profile,requirements:[{id:'psy',label:'Psychology elective',status:'incomplete',requiredCount:1,remainingCount:1,coursesUsed:[],children:[],rule:{type:'count',minimum:1,rule:{type:'range',subject:'PSY',min:3000,max:3999,campus:'UMNTC'}},rawMetadata:{}}]};
 const ordered=sortCoursesForProfile([course('HIST 3001'),course('PSY 3001'),course('MATH 4242')],p);
 assert.deepEqual(ordered.map(c=>c.code),['PSY 3001','HIST 3001','MATH 4242']);
 assert.equal(ordered.length,3,'personalization reorders but never filters the official subject/course result set');
});

test('subject code validation is strict and canonical',()=>{
 assert.equal(subjectCode(' csci '),'CSCI');
 assert.throws(()=>subjectCode('CSCI/../MATH'),/Expected a UMN subject/);
});

test('Schedule Builder subject discovery uses official wildcard and bulk course routes',async()=>{
 const calls:string[]=[];
 const fetcher:typeof fetch=async(input)=>{const url=new URL(String(input));calls.push(url.href);const type=url.searchParams.get('type');
  if(type==='courses_wildcard')return new Response(JSON.stringify([11,12]),{status:200,headers:{'content-type':'application/json'}});
  if(type==='courses')return new Response(JSON.stringify([
   {complete:true,valid:true,id:11,institution:'UMNTC',campus:'UMNTC',term:1273,subject:'CSCI',catalog_nbr:'5302',title:'Analysis of Numerical Algorithms',description:['Numerical methods.','prereq: No prerequisites'],credits:'3.00',min_credits:'3.00',max_credits:'3.00',attributes:[],equivalents:[],sections:[57085]},
   {complete:true,valid:true,id:12,institution:'UMNTC',campus:'UMNTC',term:1273,subject:'CSCI',catalog_nbr:'5521',title:'Machine Learning Fundamentals',description:['Machine learning.','prereq: CSCI 4041'],credits:'3.00',min_credits:'3.00',max_credits:'3.00',attributes:[],equivalents:[],sections:[57086]}
  ]),{status:200,headers:{'content-type':'application/json'}});
  return new Response('not found',{status:404});
 };
 const store=new Store(':memory:');
 try{
  const p=new ScheduleBuilderProvider(store,fetcher),result=await p.fetchSubjectCourses('CSCI','1273');
  assert.equal(result.health.status,'healthy');assert.equal(result.stale,false);assert.deepEqual(result.data?.map(c=>c.code),['CSCI 5302','CSCI 5521']);
  assert.equal(calls.length,2);assert.match(calls[0],/type=courses_wildcard/);assert.match(calls[0],/subject=CSCI/);assert.match(calls[1],/type=courses/);assert.match(calls[1],/crse_ids=11%2C12/);
 }finally{store.close();}
});


test('Schedule Builder normalizes structured equivalent courses to canonical UMN codes',()=>{
 const store=new Store(':memory:');
 try{
  const provider=new ScheduleBuilderProvider(store);
  const normalized=provider.normalize({
   complete:true,valid:true,id:21,institution:'UMNTC',campus:'UMNTC',term:1273,subject:'CSCI',catalog_nbr:'1133',
   title:'Introduction to Computing and Programming Concepts',description:['Intro.','prereq: none'],credits:'4.00',min_credits:'4.00',max_credits:'4.00',
   attributes:[],sections:[10001],equivalents:[{id:811072,subject:'CSCI',catalog_nbr:'1133H',visible:true,title:'Honors Introduction to Computing and Programming Concepts'}]
  },'UMNTC');
  assert.deepEqual(normalized.equivalents,['CSCI 1133H']);
 }finally{store.close();}
});

test('large exact APAS pools use bounded subject catalogs before loading course context',async()=>{
 const {degreeDiscoverySubjects}=await import('../packages/core/rules.ts');
 const plan={explicitCodes:[...Array.from({length:40},(_,i)=>`MATH ${4000+i}`),...Array.from({length:15},(_,i)=>`STAT ${5000+i}`),'BIOL 1001'],subjects:['CSCI'],attributes:[]};
 assert.deepEqual(degreeDiscoverySubjects(plan,3),{subjects:['CSCI','MATH','STAT'],omitted:1});
 assert.deepEqual(degreeDiscoverySubjects({...plan,subjects:['MATH']},2),{subjects:['MATH','STAT'],omitted:1});
});
