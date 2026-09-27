import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {parseAPAS} from '../packages/apas-parser/index.ts';
import {analyzeRequirementRouteCoverage,degreeDiscoveryPlan} from '../packages/core/rules.ts';

type ProgramRow={college:string;program:string};
type Inventory={source:string;sourceLabel:string;fetchedAt:string;rowCount:number;programs:ProgramRow[]};
type MajorInventory={source:string;sourceLabel:string;fetchedAt:string;majorCount:number;majors:string[]};
const inventory=JSON.parse(fs.readFileSync(new URL('../config/twin-cities-undergraduate-programs.json',import.meta.url),'utf8')) as Inventory;
const majorInventory=JSON.parse(fs.readFileSync(new URL('../config/twin-cities-undergraduate-majors.json',import.meta.url),'utf8')) as MajorInventory;
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function structuralAudit(program:string){
 return `<body><div id="audit"><div class="card-header"><h2>${esc(program)}</h2></div>
 <div class="requirement Status_NO" rname="EXACT" rqdsubreq="1"><div class="reqTitle">Approved course</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="1001"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="RANGE" rqdhours="6"><div class="reqTitle">Upper division coursework</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="3XXX"></span></td></tr></tbody></table></div>
 <div class="requirement Status_IP" rname="LEVEL"><div class="reqTitle">4xxx/5xxx-level GEN coursework</div><div class="reqBody"></div></div>
 <div class="requirement Status_IP" rname="DESIGNATOR"><div class="reqTitle">6 credits must have a GEN designator.</div><div class="reqBody"></div></div>
 <div class="requirement Status_NO" rname="CAP" rqdhours="12" maxhours="9"><div class="reqTitle">Take up to 9 credits from the following list. Note: cap applies.</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="3001"></span><span class="course" department="1GEN" number="3002"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="EXCLUDE" rqdsubreq="1"><div class="reqTitle">Approved course with exclusion</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="3201"></span></td></tr></tbody></table><table class="notcourses"><tbody><tr><td><span class="course" department="1GEN" number="3202"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="GPA" rqdhours="3" rqdgpa="2.0"><div class="reqTitle">GEN GPA route</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="4001"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="NEEDS"><div class="reqTitle">Choose one approved GEN course</div><div class="reqNeeds"><span class="count">1</span></div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="4101"></span><span class="course" department="1GEN" number="4102"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO category_Total_Hours" rname="TOTAL" rqdhours="120"><div class="reqTitle">Minimum total degree credits</div><div class="reqBody"></div></div>
 <div class="requirement Status_NO" rname="RESIDENCY"><div class="reqTitle">Residency policy requires institutional review</div><div class="reqBody"></div></div>
 </div></body>`;
}

test('official Twin Cities undergraduate program snapshot is nonempty, unique and internally consistent',()=>{
 assert.equal(inventory.rowCount,inventory.programs.length);
 assert.ok(inventory.programs.length>=150);
 assert.equal(new Set(inventory.programs.map(p=>`${p.college}|${p.program}`)).size,inventory.programs.length);
 assert.ok(new Set(inventory.programs.map(p=>p.college)).size>=8);
});

function assertStructuralIdentity(name:string){
 const dom=new JSDOM(structuralAudit(name));
 try{
  const profile=parseAPAS(dom.window.document);
  const summary=analyzeRequirementRouteCoverage(profile).overall;
  const discovery=degreeDiscoveryPlan(profile,'UMNTC');
  assert.equal(profile.program.name,name,name);
  assert.equal(summary.totalActiveRemainingRequirements,10,name);
  assert.equal(summary.strictSupportedRequirements,7,name);
  assert.equal(summary.candidateRouteSupportedRequirements,1,name);
  assert.equal(summary.policyConstraints,1,name);
  assert.equal(summary.unknownUnroutedRequirements,1,name);
  assert.ok(discovery.explicitCodes.includes('GEN 1001'),name);
  assert.ok(discovery.subjects.includes('GEN'),name);
 }finally{dom.window.close();}
}

test('every official Twin Cities undergraduate program title passes the same generic APAS structural matrix',()=>{
 for(const row of inventory.programs)assertStructuralIdentity(row.program);
});

test('official Twin Cities major snapshot is nonempty, unique and current-shape compatible',()=>{
 assert.equal(majorInventory.majorCount,majorInventory.majors.length);
 assert.ok(majorInventory.majors.length>=140);
 assert.equal(new Set(majorInventory.majors).size,majorInventory.majors.length);
});

test('every official Twin Cities major name passes the same generic APAS structural matrix',()=>{
 for(const major of majorInventory.majors)assertStructuralIdentity(major);
});

test('the official-inventory matrix exercises strict, candidate, policy and fail-closed routes',()=>{
 const dom=new JSDOM(structuralAudit('Program Identity Independence Probe'));
 try{
  const summary=analyzeRequirementRouteCoverage(parseAPAS(dom.window.document)).overall;
  assert.deepEqual(
   {
    total:summary.totalActiveRemainingRequirements,
    strict:summary.strictSupportedRequirements,
    candidate:summary.candidateRouteSupportedRequirements,
    policy:summary.policyConstraints,
    unknown:summary.unknownUnroutedRequirements
   },
   {total:10,strict:7,candidate:1,policy:1,unknown:1}
  );
  assert.equal(summary.breakdown.candidateOnly,1);
  assert.equal(summary.breakdown.gpa,1);
  assert.equal(summary.breakdown.unknown,1);
 }finally{dom.window.close();}
});
