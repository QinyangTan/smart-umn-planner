import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseHistory} from '../packages/apas-parser/index.ts';
import {eligibility,passed} from '../packages/core/rules.ts';
import type {Course,StudentAcademicProfile,StudentCourse} from '../packages/schemas/index.ts';

const now='2026-09-27T21:00:00.000Z';

function historyHTML(){
 return `<body><table>
  <thead><tr>
   <th>Term</th><th>Course</th><th>Credits</th><th>Grade</th><th>Title</th><th>Status</th><th>Transfer Institution/Course</th>
  </tr></thead>
  <tbody>
   <tr><td>F 26</td><td>1MATH1271</td><td>4.00</td><td></td><td>Calculus I</td><td>Complete</td><td>Advanced Placement / Calculus BC</td></tr>
   <tr><td>F 26</td><td>1PHYS1301</td><td>4.00</td><td></td><td>Introductory Physics</td><td>Complete</td><td>International Baccalaureate / Physics HL</td></tr>
  </tbody>
 </table></body>`;
}

function profile(transferCourses:StudentCourse[]):StudentAcademicProfile{
 return{
  program:{name:'Synthetic Twin Cities Degree',campus:'UMNTC'},
  degreeCredits:{},
  completedCourses:[],
  inProgressCourses:[],
  transferCourses,
  requirements:[],
  syncedAt:now,
  parserVersion:'fixture',
  warnings:[],
  provenance:{source:'fixture',retrievedAt:now,period:'fixture'}
 };
}

function course(code:string,prerequisiteCode?:string):Course{
 const[subject,catalogNumber]=code.split(' ');
 return{
  institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,
  title:code,description:'fixture',credits:4,
  prerequisites:prerequisiteCode?prerequisiteCode:'No prerequisites',
  prerequisiteRule:prerequisiteCode?{type:'course',code:prerequisiteCode,campus:'UMNTC'}:{type:'allOf',rules:[]},
  attributes:[],sectionIds:['1'],equivalents:[],sourceRefs:{},
  provenance:{source:'fixture',retrievedAt:now,period:'1273'}
 };
}

test('APAS course history preserves awarded AP and IB credit as mapped UMN transfer courses',()=>{
 const dom=new JSDOM(historyHTML());
 try{
  const rows=parseHistory(dom.window.document);
  assert.deepEqual(rows.map(r=>({code:r.courseCode,campus:r.campus,credits:r.credits,status:r.status,source:r.transferSource})),[
   {code:'MATH 1271',campus:'UMNTC',credits:4,status:'transfer',source:'Advanced Placement / Calculus BC'},
   {code:'PHYS 1301',campus:'UMNTC',credits:4,status:'transfer',source:'International Baccalaureate / Physics HL'}
  ]);
 }finally{dom.window.close();}
});

test('grade-less APAS-awarded AP credit satisfies a prerequisite through its UMN equivalent',()=>{
 const dom=new JSDOM(historyHTML());
 try{
  const p=profile(parseHistory(dom.window.document));
  assert.deepEqual(eligibility(course('MATH 2373','MATH 1271'),p),{
   result:'yes',
   reason:'Prerequisites satisfied by completed courses'
  });
 }finally{dom.window.close();}
});

test('APAS-awarded AP credit blocks duplicate enrollment in the mapped UMN course',()=>{
 const dom=new JSDOM(historyHTML());
 try{
  const p=profile(parseHistory(dom.window.document));
  assert.deepEqual(eligibility(course('MATH 1271'),p),{
   result:'no',
   reason:'Already completed; duplicate credit excluded'
  });
 }finally{dom.window.close();}
});

test('blank-grade transfer rows require positive awarded credit and an explicit source',()=>{
 const base:StudentCourse={courseCode:'MATH 1271',campus:'UMNTC',subject:'MATH',number:'1271',grade:'',status:'transfer'};
 assert.equal(passed({...base,credits:4,transferSource:'Advanced Placement / Calculus BC'}),true);
 assert.equal(passed({...base,credits:0,transferSource:'Advanced Placement / Calculus BC'}),false);
 assert.equal(passed({...base,credits:4}),false);
});
