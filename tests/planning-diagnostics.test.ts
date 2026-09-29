import test from'node:test';import assert from'node:assert/strict';
import{profileHealth}from'../packages/core/profile-health.ts';
import{diagnosePlan}from'../packages/core/plan-diagnostics.ts';
import type{Course,CourseContext,StudentAcademicProfile}from'../packages/schemas/index.ts';

const now='2026-09-28T00:00:00.000Z',prov={source:'fixture',retrievedAt:now,period:'1273'};
const req=(id:string,rule:any,status:'incomplete'|'complete'='incomplete')=>({id,label:id,status,remainingCount:1,requiredCount:1,coursesUsed:[],children:[],rawMetadata:{},rule}) as any;
function profile(over:Partial<StudentAcademicProfile>={}):StudentAcademicProfile{return{program:{name:'Synthetic BS',campus:'UMNTC',kind:'degree'},degreeCredits:{required:120,completed:90,remaining:30},completedCourses:[{courseCode:'CSCI 1933',campus:'UMNTC',subject:'CSCI',number:'1933',credits:4,grade:'A',status:'completed'}],inProgressCourses:[],transferCourses:[],requirements:[req('core',{type:'count',minimum:1,rule:{type:'course',code:'CSCI 4041',campus:'UMNTC'}})],syncedAt:now,parserVersion:'0.4.6',warnings:[],provenance:prov,...over} as StudentAcademicProfile;}
const course=(code:string,prereq:any={type:'allOf',rules:[]}):Course=>{const[subject,catalogNumber]=code.split(' ');return{institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,title:code,description:'',credits:4,prerequisites:'',prerequisiteRule:prereq,attributes:[],sectionIds:['1'],equivalents:[],sourceRefs:{},provenance:prov};};
const ctx=(c:Course):CourseContext=>({course:{data:c,stale:false,provenance:prov,health:{source:'f',status:'healthy',checkedAt:now}},sections:{data:[],stale:false,provenance:prov,health:{source:'f',status:'healthy',checkedAt:now}},grades:{data:null,stale:false,provenance:prov,health:{source:'f',status:'healthy',checkedAt:now}},feedback:{data:null,stale:false,provenance:prov,health:{source:'f',status:'healthy',checkedAt:now}},community:[]} as any);

test('profile health flags an old parser and courses without a campus, without repairing them',()=>{
 assert.deepEqual(profileHealth(profile(),'0.4.6'),[]);
 const old=profile({parserVersion:'0.3.0',completedCourses:[{courseCode:'CSCI 1933',subject:'CSCI',number:'1933',credits:4,grade:'A',status:'completed'} as any]});
 const kinds=profileHealth(old,'0.4.6').map(i=>i.kind);assert.deepEqual(kinds,['stale-parser','missing-campus']);
 assert.equal(old.completedCourses[0].campus,undefined,'campus is never inferred');
 const policyOnly=profile({requirements:[req('gpa',{type:'policy',family:'institutional-gpa',sourceText:'x',reason:'x',parameters:{}})]});
 assert.deepEqual(profileHealth(policyOnly,'0.4.6').map(i=>i.kind),['no-automatic-routes']);
});

test('plan diagnosis names the exact stage that produced zero schedules',()=>{
 const p=profile();
 const none=diagnosePlan(p,{catalogCourses:120,matchingCourses:0,contexts:[]},[],'Spring 2027');
 assert.equal(none.stage,'no-current-offerings');assert.match(none.headline,/No Spring 2027 offering matches/);
 const review=diagnosePlan(p,{catalogCourses:120,matchingCourses:1,contexts:[ctx(course('CSCI 4041',{type:'course',code:'CSCI 2011',campus:'UMNTC'}))]});
 assert.equal(review.stage,'no-verified-prerequisites');assert.equal(review.prerequisites.notMet,1);assert.equal(review.prerequisites.topReasons[0].reason,'Prerequisite course not completed');
 const ok=course('CSCI 4041',{type:'course',code:'CSCI 1933',campus:'UMNTC'});
 const clash=diagnosePlan(p,{catalogCourses:120,matchingCourses:1,contexts:[ctx(ok)],scheduled:{schedules:0,rejected:[{code:'CSCI 4041',reason:'No verified open section bundle meets timing, linkage and restriction constraints'}]}});
 assert.equal(clash.stage,'no-conflict-free-week');assert.equal(clash.prerequisites.verified,1);assert.match(clash.actions.join(' '),/minimum credits/);
 const done=diagnosePlan(p,{catalogCourses:120,matchingCourses:1,contexts:[ctx(ok)],scheduled:{schedules:3,rejected:[]}});assert.equal(done.stage,'scheduled');
});

test('diagnosis puts re-sync first when the stored profile is outdated or missing campus data',()=>{
 const p=profile({completedCourses:[{courseCode:'CSCI 1933',subject:'CSCI',number:'1933',credits:4,grade:'A',status:'completed'} as any]});
 const issues=profileHealth(p,'0.4.6');
 const d=diagnosePlan(p,{catalogCourses:50,matchingCourses:1,contexts:[ctx(course('CSCI 4041',{type:'course',code:'CSCI 1933',campus:'UMNTC'}))]},issues);
 assert.equal(d.stage,'no-verified-prerequisites','a campus-less transcript cannot prove the prerequisite');
 assert.match(d.actions[0],/Re-sync APAS/);
 assert.equal(d.prerequisites.topReasons[0].reason,'Completed course has no recorded campus','the data gap is named as the blocker');
 const policyOnly=profile({requirements:[req('gpa',{type:'policy',family:'institutional-gpa',sourceText:'x',reason:'x',parameters:{}})]});
 assert.equal(diagnosePlan(policyOnly,{catalogCourses:0,matchingCourses:0,contexts:[]}).stage,'no-automatic-routes');
});
