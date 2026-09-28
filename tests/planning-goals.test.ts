import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateSchedules} from '../packages/core/solver.ts';
import {historicalGradeSignal} from '../packages/core/grade-signal.ts';
import {whyThisPlan} from '../packages/core/planning.ts';
import type {CourseContext,StudentAcademicProfile} from '../packages/schemas/index.ts';

const now=()=>new Date().toISOString();
const profile:StudentAcademicProfile={
 program:{name:'Synthetic degree',campus:'UMNTC'},degreeCredits:{required:120,completed:90,remaining:30},completedCourses:[],inProgressCourses:[],transferCourses:[],
 requirements:[{id:'elective',label:'One upper-level CSCI course',status:'incomplete',coursesUsed:[],children:[],rule:{type:'count',minimum:1,rule:{type:'range',subject:'CSCI',min:5000,max:5999,campus:'UMNTC'}},rawMetadata:{}}],
 syncedAt:now(),parserVersion:'fixture',warnings:[],provenance:{source:'fixture',retrievedAt:now(),period:'fixture'}
};
function context(code:string,credits:number,day:string,grades?:Record<string,number>):CourseContext{
 const stamp=now(),course={institution:'UMNTC' as const,campus:'UMNTC' as const,term:'1273',subject:'CSCI',catalogNumber:code.split(' ')[1],code,title:code,description:'fixture',credits,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf' as const,rules:[]},attributes:[],sectionIds:[code],equivalents:[],sourceRefs:{},provenance:{source:'fixture',retrievedAt:stamp,period:'1273'}};
 const evidence=<T>(data:T)=>({data,stale:false,provenance:{source:'fixture',retrievedAt:stamp,period:'1273'},health:{source:'fixture',status:'healthy' as const,checkedAt:stamp}});
 return{course:evidence(course),sections:evidence([{classNumber:code,sectionNumber:'001',courseCode:code,term:'1273',component:'LEC',credits,instructors:[],meetings:[{days:[day],startTime:'09:00',endTime:'10:00',startDate:'2027-01-20',endDate:'2027-05-05',location:'Test Hall'}],capacity:30,enrolled:5,open:true,enrollable:true,instructionMode:'In Person',restrictions:[],prerequisiteRule:{type:'allOf' as const,rules:[]},linkedClassNumbers:[],unresolvedLinks:false,scheduleKnown:true,provenance:{source:'fixture',retrievedAt:stamp,period:'1273'}}]),grades:evidence(grades?{courseCode:code,totalStudents:Object.values(grades).reduce((a,b)=>a+b,0),grades,distributions:[]}:null),feedback:evidence(null),community:[]};
}

test('light-load goal chooses fewer credits only after equal supported requirement coverage',()=>{
 const one=context('CSCI 5101',1,'mon'),three=context('CSCI 5303',3,'tue');
 const regular=generateSchedules([one,three],profile,{minCredits:1,maxCredits:3});
 const light=generateSchedules([one,three],profile,{minCredits:1,maxCredits:3,planningGoal:'lightLoad'});
 assert.equal(regular.schedules[0].credits,3);
 assert.equal(light.schedules[0].credits,1);
 assert.equal(light.schedules[0].degreeProgress?.fullyCoveredTargets,1);
 assert.match(whyThisPlan(light.schedules[0],{minCredits:1,maxCredits:3,planningGoal:'lightLoad'}).join(' '),/equal supported APAS coverage/);
});

test('historical-grade goal ranks only real complete evidence after degree coverage, and missing data remains unknown',()=>{
 const low=context('CSCI 5101',3,'mon',{A:6,B:24}),high=context('CSCI 5303',3,'tue',{A:24,B:6});
 const result=generateSchedules([low,high],profile,{minCredits:3,maxCredits:3,planningGoal:'gradeHistory'});
 assert.equal(result.schedules[0].courses[0].code,'CSCI 5303');
 assert.match(whyThisPlan(result.schedules[0],{minCredits:3,maxCredits:3,planningGoal:'gradeHistory'},[low,high]).join(' '),/80% A-range/);
 high.grades.stale=true;
 assert.equal(historicalGradeSignal(result.schedules[0],[low,high]),undefined);
 high.grades.stale=false;high.grades.data!.grades={A:2,B:3};
 assert.equal(historicalGradeSignal(result.schedules[0],[low,high]),undefined);
 const missing=context('CSCI 5404',3,'wed');
 const ranked=generateSchedules([low,missing],profile,{minCredits:3,maxCredits:3,planningGoal:'gradeHistory'});
 assert.equal(ranked.schedules[0].courses[0].code,'CSCI 5101');
 assert.match(whyThisPlan(ranked.schedules[1],{minCredits:3,maxCredits:3,planningGoal:'gradeHistory'},[low,missing]).join(' '),/unranked, not treated as a poor grade/);
});
