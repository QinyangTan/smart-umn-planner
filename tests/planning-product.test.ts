import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {CourseContext,Preferences,Schedule,StudentAcademicProfile} from '../packages/schemas/index.ts';
import {actionableReview,buildAdvisorBrief,buildGraduationRoadmap,compatibilityPassport,futurePlanningTerms,likelyInTerm,offeringPattern,termDisplay,whyThisPlan} from '../packages/core/planning.ts';

const now=new Date().toISOString();
const profile:StudentAcademicProfile={program:{name:'Computer Science B.S.',campus:'UMNTC',kind:'degree'},degreeCredits:{required:120,completed:84,remaining:36},completedCourses:[],inProgressCourses:[],transferCourses:[],requirements:[{id:'r1',label:'Upper division CSCI',status:'incomplete',requiredCredits:12,remainingCredits:12,coursesUsed:[],children:[],rule:{type:'credits',minimum:12,rule:{type:'range',subject:'CSCI',min:5000,max:5999,campus:'UMNTC'}},rawMetadata:{}},{id:'policy',label:'Residency',status:'incomplete',requiredCredits:30,remainingCredits:30,coursesUsed:[],children:[],rule:{type:'unknown',sourceText:'Residency',reason:'Residency policy requires institutional review'},rawMetadata:{}}],additionalPrograms:[{program:{name:'Statistics Minor',kind:'minor',campus:'UMNTC'},requirements:[{id:'m1',label:'STAT elective',status:'incomplete',requiredCount:1,remainingCount:1,coursesUsed:[],children:[],rule:{type:'count',minimum:1,rule:{type:'range',subject:'STAT',min:3000,max:5999,campus:'UMNTC'}},rawMetadata:{}}],syncedAt:now,parserVersion:'test',warnings:[],provenance:{source:'fixture',retrievedAt:now,period:'fixture'}}],syncedAt:now,parserVersion:'0.4.2',warnings:[],provenance:{source:'fixture',retrievedAt:now,period:'fixture'}};
function ctx(code='CSCI 5103'):CourseContext{const[subject,catalogNumber]=code.split(' ');return{course:{data:{institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,title:code,description:'fixture',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf',rules:[]},attributes:[],sectionIds:['1'],equivalents:[],sourceRefs:{},provenance:{source:'fixture',retrievedAt:now,period:'1273'}},stale:false,provenance:{source:'fixture',retrievedAt:now,period:'1273'},health:{source:'fixture',status:'healthy',checkedAt:now}},sections:{data:[],stale:false,provenance:{source:'fixture',retrievedAt:now,period:'1273'},health:{source:'fixture',status:'healthy',checkedAt:now}},grades:{data:{courseCode:code,totalStudents:100,grades:{A:50,B:50},distributions:[{term:'1249',students:20,grades:{A:10,B:10}},{term:'1259',students:20,grades:{A:10,B:10}},{term:'1269',students:20,grades:{A:10,B:10}},{term:'1273',students:20,grades:{A:10,B:10}}]},stale:false,provenance:{source:'fixture',retrievedAt:now,period:'1249–1273'},health:{source:'fixture',status:'healthy',checkedAt:now}},feedback:{data:null,stale:false,provenance:{source:'fixture',retrievedAt:now,period:'none'},health:{source:'fixture',status:'down',checkedAt:now}},community:[]};}

test('UMN planning terms advance deterministically with optional summer',()=>{assert.equal(termDisplay('1273'),'Spring 2027');assert.deepEqual(futurePlanningTerms('1273',4,false),['1273','1279','1283','1289']);assert.deepEqual(futurePlanningTerms('1273',4,true),['1273','1275','1279','1283']);});
test('historical reported terms create a transparent offering pattern',()=>{const p=offeringPattern(ctx());assert.equal(p.confidence,'limited');assert.deepEqual(p.seasons,['Fall','Spring']);assert.equal(likelyInTerm(p,'1279'),true);assert.equal(likelyInTerm(p,'1275'),false);assert.match(p.label,/Fall/);});
test('actionable uncertainty maps review reasons to student next steps',()=>{assert.equal(actionableReview('Instructor consent required').kind,'prerequisite');assert.match(actionableReview('Residency policy').action,/APAS|advisor/);assert.equal(actionableReview('Reserved seats').kind,'restriction');});
test('compatibility passport contains only structural counts and a shape fingerprint',()=>{const p=compatibilityPassport(profile);assert.equal(p.programCount,2);assert.equal(p.transferCourseCount,0);assert.match(p.fingerprint,/^[0-9a-f]{8}$/);assert.equal('programName' in p,false);});
test('graduation roadmap stays bounded and does not invent future courses',()=>{const course=ctx().course.data!,schedule:Schedule={id:'s',sections:[],courses:[course],credits:3,campusDays:2,explanations:[],degreeProgress:{allocations:[],unallocatedCourseCodes:[],fullyCoveredTargets:1,totalTargets:2,coverageScore:1,allocatedCredits:3}};const prefs:Preferences={minCredits:3,maxCredits:12,fewestDays:true};const road=buildGraduationRoadmap(profile,'1273',schedule,[ctx()],prefs,{includeSummer:false});assert.equal(road.semesters[0].courseCodes[0],'CSCI 5103');assert.ok(road.semesters.slice(1).every(s=>s.courseCodes.length===0));assert.match(road.headline,/planning term/);assert.match(road.bottlenecks.join(' '),/Residency|policy/i);const primary=buildGraduationRoadmap(profile,'1273',schedule,[ctx()],prefs,{primaryOnly:true});assert.equal(primary.semesters.length,road.semesters.length);});
test('roadmap respects prerequisite order and historical season evidence',()=>{
 const a=ctx('CSCI 5100'),b=ctx('CSCI 5200');
 a.grades.data!.distributions=[{term:'1249',students:20,grades:{A:10,B:10}},{term:'1259',students:20,grades:{A:10,B:10}},{term:'1269',students:20,grades:{A:10,B:10}}];
 b.grades.data!.distributions=[{term:'1253',students:20,grades:{A:10,B:10}},{term:'1263',students:20,grades:{A:10,B:10}},{term:'1273',students:20,grades:{A:10,B:10}}];
 b.course.data!.prerequisites='CSCI 5100';b.course.data!.prerequisiteRule={type:'course',code:'CSCI 5100',campus:'UMNTC'};
 const road=buildGraduationRoadmap(profile,'1273',undefined,[a,b],{minCredits:3,maxCredits:3},{includeSummer:false,creditsPerTerm:3});
 assert.deepEqual(road.semesters.find(s=>s.term==='1279')?.courseCodes,['CSCI 5100']);
 assert.deepEqual(road.semesters.find(s=>s.term==='1283')?.courseCodes,['CSCI 5200']);
});

test('advisor brief answers the student decision before exposing the machinery',()=>{const course=ctx().course.data!,schedule:Schedule={id:'s',sections:[],courses:[course],credits:3,campusDays:2,explanations:[],degreeProgress:{allocations:[],unallocatedCourseCodes:[],fullyCoveredTargets:1,totalTargets:2,coverageScore:1,allocatedCredits:3}};const brief=buildAdvisorBrief(profile,'1273',schedule,[ctx()],{minCredits:3,maxCredits:12,fewestDays:true});assert.equal(brief.status,'attention');assert.match(brief.headline,/Current evidence/);assert.match(brief.summary,/3 credits/);assert.ok(brief.nextDecisions.some(d=>d.kind==='register'));assert.ok(brief.nextDecisions.some(d=>d.kind==='review'));assert.equal(brief.nextDecisions.length<=4,true);});

test('why-this-plan is deterministic and preference aware',()=>{const course=ctx().course.data!,schedule:Schedule={id:'s',sections:[],courses:[course],credits:3,campusDays:2,explanations:[],degreeProgress:{allocations:[],unallocatedCourseCodes:[],fullyCoveredTargets:1,totalTargets:2,coverageScore:1,allocatedCredits:3}};const why=whyThisPlan(schedule,{minCredits:3,maxCredits:12,fewestDays:true,noFriday:true,latestTime:'20:00',minimumTransitionMinutes:15},[ctx()]);assert.match(why.join(' '),/Covers 1 of 2/);assert.match(why.join(' '),/Friday/);assert.match(why.join(' '),/20:00/);assert.match(why.join(' '),/15 minutes/);});

test('missing or invalid degree-credit totals cannot claim completion or a graduation term',()=>{
 for(const degreeCredits of [{},{remaining:-1},{remaining:NaN},{required:120}]){
  const p={...profile,degreeCredits};
  const road=buildGraduationRoadmap(p,'1273',undefined,[],{minCredits:3,maxCredits:12});
  assert.equal(road.confidence,'review');
  assert.equal(road.estimatedGraduation,'Not enough evidence');
  assert.match(road.headline,/degree.credit.*unavailable/i);
  assert.doesNotMatch(road.headline,/reaches|About/);
 }
});
test('dropping a course recalculates the credit horizon before creating semesters',()=>{
 const course=ctx().course.data!,schedule:Schedule={id:'s',courses:[course],sections:[],credits:3,campusDays:2,explanations:[]};
 const p={...profile,degreeCredits:{remaining:3}};
 const road=buildGraduationRoadmap(p,'1273',schedule,[ctx()],{minCredits:3,maxCredits:3},{dropCourseCode:course.code});
 assert.equal(road.remainingCredits,3);
 assert.equal(road.semesters[0].courseCodes.length,0);
 assert.equal(road.semesters[0].targetCredits,0);
 assert.equal(road.semesters.length,2);
 assert.doesNotMatch(road.headline,/reaches/);
});
test('a future course cannot satisfy another prerequisite in the same semester',()=>{
 const a=ctx('CSCI 5100'),b=ctx('CSCI 5200');
 b.course.data!.prerequisiteRule={type:'course',code:'CSCI 5100',campus:'UMNTC'};
 const p={...profile,degreeCredits:{remaining:12}};
 const road=buildGraduationRoadmap(p,'1273',undefined,[a,b],{minCredits:3,maxCredits:6});
 assert.deepEqual(road.semesters.find(s=>s.term==='1279')?.courseCodes,['CSCI 5100']);
 assert.deepEqual(road.semesters.find(s=>s.term==='1283')?.courseCodes,['CSCI 5200']);
});
