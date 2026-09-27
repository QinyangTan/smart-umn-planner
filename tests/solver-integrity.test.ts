import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateSchedules} from '../packages/core/solver.ts';
import type {Course,CourseContext,Section,StudentAcademicProfile} from '../packages/schemas/index.ts';
const now=()=>new Date().toISOString();
const profile:StudentAcademicProfile={
 program:{name:'Synthetic CS BS'},degreeCredits:{required:120,completed:90,remaining:30},
 completedCourses:[],inProgressCourses:[],transferCourses:[],
 requirements:[
  {id:'exact',label:'Numerical Algorithms requirement',status:'incomplete',coursesUsed:[],children:[],rule:{type:'course',code:'CSCI 5302'},rawMetadata:{}},
  {id:'broad',label:'5000-level technical elective',status:'incomplete',requiredCredits:3,remainingCredits:3,coursesUsed:[],children:[],rule:{type:'credits',minimum:3,rule:{type:'range',subject:'CSCI',min:5000,max:5999}},rawMetadata:{}}
 ],
 syncedAt:now(),parserVersion:'fixture',warnings:[],provenance:{source:'fixture',retrievedAt:now(),period:'fixture'}
};
function course(code:string):Course{const[subject,catalogNumber]=code.split(' ');return{institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,title:code,description:'fixture',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf',rules:[]},attributes:[],sectionIds:['1'],equivalents:[],sourceRefs:{},provenance:{source:'fixture',retrievedAt:now(),period:'1273'}};}
function context(code:string,day:string,classNumber:string):CourseContext{
 const c=course(code),section:Section={classNumber,sectionNumber:'001',courseCode:code,term:'1273',component:'LEC',credits:3,instructors:[],meetings:[{days:[day],startTime:'09:00',endTime:'10:00',startDate:'2027-01-20',endDate:'2027-05-05',location:'Test Hall'}],capacity:100,enrolled:10,waitlistCapacity:20,waitlistTotal:0,open:true,enrollable:true,instructionMode:'In Person',restrictions:[],prerequisiteRule:{type:'allOf',rules:[]},linkedClassNumbers:[],unresolvedLinks:false,scheduleKnown:true,provenance:{source:'fixture',retrievedAt:now(),period:'1273'}};
 const evidence=(data:any)=>({data,stale:false,provenance:{source:'fixture',retrievedAt:now(),period:'1273'},health:{source:'fixture',status:'healthy' as const,checkedAt:now()}});
 return{course:evidence(c),sections:evidence([section]),grades:evidence(null),feedback:evidence(null),community:[]};
}


const prefs={minCredits:3,maxCredits:3};
test('fresh coherent evidence still produces a schedule',()=>assert.equal(generateSchedules([context('CSCI 5302','mon','1')],profile,prefs).schedules.length,1));
for(const kind of ['invalid timestamp','future timestamp','old nested section','wrong course','wrong campus','reversed time','reversed dates','empty meetings','nonfinite credits','negative seats'] as const){
 test('solver rejects '+kind,()=>{
  const c=context('CSCI 5302','mon','1'),s=c.sections.data![0];
  if(kind==='invalid timestamp')c.sections.provenance.retrievedAt='not-a-date';
  if(kind==='future timestamp')c.sections.provenance.retrievedAt=new Date(Date.now()+3600000).toISOString();
  if(kind==='old nested section')s.provenance.retrievedAt=new Date(Date.now()-120000).toISOString();
  if(kind==='wrong course')s.courseCode='MATH 4242';
  if(kind==='wrong campus')s.campus='UMNDL';
  if(kind==='reversed time')s.meetings[0].endTime='08:00';
  if(kind==='reversed dates')s.meetings[0].endDate='2026-01-01';
  if(kind==='empty meetings')s.meetings=[];
  if(kind==='nonfinite credits')c.course.data!.credits=NaN;
  if(kind==='negative seats')s.enrolled=-1;
  const result=generateSchedules([c],profile,prefs);
  assert.equal(result.schedules.length,0,kind+' must not authorize a schedule');
  assert.equal(result.rejected.length,1);
 });
}
test('equivalent-course metadata alone does not make an otherwise valid course unschedulable',()=>{
 const c=context('CSCI 5302','mon','eq-single');
 c.course.data!.equivalents=['CSCI 5421'];
 assert.equal(generateSchedules([c],profile,prefs).schedules.length,1);
});

test('one generated schedule never combines mutually equivalent courses',()=>{
 const a=context('CSCI 5302','mon','eq-a'),b=context('CSCI 5421','tue','eq-b');
 a.course.data!.equivalents=['CSCI 5421'];b.course.data!.equivalents=['CSCI 5302'];
 const result=generateSchedules([a,b],profile,{minCredits:6,maxCredits:6});
 assert.equal(result.rejected.length,0,'each course is individually eligible');
 assert.equal(result.schedules.length,0,'equivalent courses cannot be combined to reach the credit target');
});

test('latest-class preference rejects sections ending too late',()=>{
 const c=context('CSCI 5302','mon','late');c.sections.data![0].meetings[0].startTime='18:00';c.sections.data![0].meetings[0].endTime='19:15';
 assert.equal(generateSchedules([c],profile,{minCredits:3,maxCredits:3,latestTime:'18:30'}).schedules.length,0);
 assert.equal(generateSchedules([c],profile,{minCredits:3,maxCredits:3,latestTime:'20:00'}).schedules.length,1);
});

test('different-location transition buffer rejects unrealistic back-to-back travel',()=>{
 const a=context('CSCI 5302','mon','walk-a'),b=context('CSCI 5421','mon','walk-b');
 a.sections.data![0].meetings[0]={...a.sections.data![0].meetings[0],startTime:'09:00',endTime:'10:00',location:'Keller Hall'};
 b.sections.data![0].meetings[0]={...b.sections.data![0].meetings[0],startTime:'10:10',endTime:'11:00',location:'West Bank'};
 assert.equal(generateSchedules([a,b],profile,{minCredits:6,maxCredits:6,minimumTransitionMinutes:15}).schedules.length,0);
 assert.equal(generateSchedules([a,b],profile,{minCredits:6,maxCredits:6,minimumTransitionMinutes:10}).schedules.length,1);
});

test('campus-day cap is enforced after a valid combination is built',()=>{
 const a=context('CSCI 5302','mon','days-a'),b=context('CSCI 5421','tue','days-b');
 assert.equal(generateSchedules([a,b],profile,{minCredits:6,maxCredits:6,maxCampusDays:1}).schedules.length,0);
 assert.equal(generateSchedules([a,b],profile,{minCredits:6,maxCredits:6,maxCampusDays:2}).schedules.length,1);
});

test('waitlist-only sections are opt-in and remain explicitly labeled',()=>{
 const c=context('CSCI 5302','mon','wait');const s=c.sections.data![0];s.capacity=10;s.enrolled=10;s.open=false;s.waitlistCapacity=20;s.waitlistTotal=2;
 assert.equal(generateSchedules([c],profile,{minCredits:3,maxCredits:3}).schedules.length,0);
 const result=generateSchedules([c],profile,{minCredits:3,maxCredits:3,allowWaitlist:true});
 assert.equal(result.schedules.length,1);assert.match(result.schedules[0].explanations.join(' '),/waitlist-only/);
});

test('different semesters cannot be combined into one plan',()=>{
 const a=context('CSCI 5302','mon','1'),b=context('CSCI 5421','tue','2');b.course.data!.term='1275';b.sections.data![0].term='1275';
 assert.throws(()=>generateSchedules([a,b],profile,{minCredits:6,maxCredits:6}),/same term and campus/);
});
