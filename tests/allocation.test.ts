import{test}from'node:test';
import assert from'node:assert/strict';
import{allocateDegreeProgress,selectDegreeCandidatePool}from'../packages/core/allocation.ts';
import{generateSchedules}from'../packages/core/solver.ts';
import type{Course,CourseContext,Section,StudentAcademicProfile}from'../packages/schemas/index.ts';

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

test('one course is never double-counted across overlapping requirements',()=>{
 const summary=allocateDegreeProgress([course('CSCI 5302')],profile);
 assert.equal(summary.coverageScore,1);
 assert.equal(summary.fullyCoveredTargets,1);
 assert.equal(summary.allocations.flatMap(a=>a.courseCodes).filter(c=>c==='CSCI 5302').length,1);
 assert.deepEqual(summary.allocations.find(a=>a.requirementId==='exact')?.courseCodes,['CSCI 5302']);
 assert.deepEqual(summary.allocations.find(a=>a.requirementId==='broad')?.courseCodes,[]);
});

test('scarcity-aware allocation preserves the flexible course for the broad requirement',()=>{
 const summary=allocateDegreeProgress([course('CSCI 5302'),course('CSCI 5421')],profile);
 assert.equal(summary.coverageScore,2);
 assert.equal(summary.fullyCoveredTargets,2);
 assert.deepEqual(summary.allocations.find(a=>a.requirementId==='exact')?.courseCodes,['CSCI 5302']);
 assert.deepEqual(summary.allocations.find(a=>a.requirementId==='broad')?.courseCodes,['CSCI 5421']);
 assert.deepEqual(summary.unallocatedCourseCodes,[]);
});

test('bounded discovery pool is balanced across scarce remaining requirements',()=>{
 const balanced:StudentAcademicProfile={...profile,requirements:[
  {id:'csci',label:'CSCI advanced',status:'incomplete',requiredCredits:6,remainingCredits:6,coursesUsed:[],children:[],rule:{type:'credits',minimum:6,rule:{type:'range',subject:'CSCI',min:5000,max:5999}},rawMetadata:{}},
  {id:'math',label:'MATH advanced',status:'incomplete',requiredCredits:3,remainingCredits:3,coursesUsed:[],children:[],rule:{type:'credits',minimum:3,rule:{type:'range',subject:'MATH',min:4000,max:4999}},rawMetadata:{}}
 ]};
 const many=[course('CSCI 5105'),course('CSCI 5123'),course('CSCI 5302'),course('CSCI 5421'),course('MATH 4242')];
 const picked=selectDegreeCandidatePool(many,balanced,2).map(c=>c.code);
 assert.equal(picked.length,2);assert.ok(picked.some(c=>c.startsWith('CSCI ')));assert.ok(picked.some(c=>c.startsWith('MATH ')));
});

test('schedule ranking prefers plans that advance more distinct supported requirements',()=>{
 const result=generateSchedules([context('CSCI 5302','mon','10001'),context('CSCI 5421','tue','10002'),context('CSCI 5607','wed','10003')],profile,{minCredits:6,maxCredits:6});
 assert.equal(result.schedules.length,3);
 assert.equal(result.schedules[0].degreeProgress?.coverageScore,2);
 assert.equal(result.schedules[1].degreeProgress?.coverageScore,2);
 assert.equal(result.schedules[2].degreeProgress?.coverageScore,1);
 assert.equal(result.schedules[0].degreeProgress?.fullyCoveredTargets,2);
 assert.match(result.schedules[0].explanations.join(' '),/allocated to at most one supported remaining requirement/);
});

test('bounded candidate pool cannot be filled by review-only courses while a proven candidate exists',()=>{
 const p:StudentAcademicProfile={...profile,requirements:[{id:'broad',label:'CSCI elective',status:'incomplete',requiredCredits:3,remainingCredits:3,coursesUsed:[],children:[],rule:{type:'credits',minimum:3,rule:{type:'range',subject:'CSCI',min:5000,max:5999}},rawMetadata:{}}]};
 const unknown=course('CSCI 5101');unknown.prerequisiteRule={type:'unknown',sourceText:'consent',reason:'Review required'};unknown.sectionIds=['1','2','3'];
 const proven=course('CSCI 5302');
 assert.deepEqual(selectDegreeCandidatePool([unknown,proven],p,1).map(c=>c.code),['CSCI 5302']);
 assert.equal(selectDegreeCandidatePool([unknown,proven],p,2).length,2,'Review-only routes remain visible when capacity allows');
});
