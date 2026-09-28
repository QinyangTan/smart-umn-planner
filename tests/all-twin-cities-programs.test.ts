import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {parseAPAS} from '../packages/apas-parser/index.ts';
import {analyzeRequirementRouteCoverage,degreeCandidateFit,degreeDiscoveryPlan,degreeFit,flattenRequirements,matches} from '../packages/core/rules.ts';

type ProgramRow={college:string;program:string};
type Inventory={source:string;sourceLabel:string;fetchedAt:string;rowCount:number;programs:ProgramRow[]};
type MajorInventory={source:string;sourceLabel:string;fetchedAt:string;majorCount:number;majors:string[]};
const syntheticCourse=(code:string)=>{const[subject,catalogNumber]=code.split(' ');return{institution:'UMNTC' as const,campus:'UMNTC' as const,term:'1273',subject,catalogNumber,code,title:code,description:'synthetic structural probe',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf' as const,rules:[]},attributes:[],sectionIds:['1'],equivalents:[],sourceRefs:{},provenance:{source:'fixture',retrievedAt:'2026-09-27T00:00:00.000Z',period:'1273'}};};
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
 <div class="requirement Status_NO" rname="EXCLUDE" rqdsubreq="1"><div class="reqTitle">Approved EXCL 3xxx course except EXCL 3202</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1EXCL" number="3XXX"></span></td></tr></tbody></table><table class="notcourses"><tbody><tr><td><span class="course" department="1EXCL" number="3202"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="GPA" rqdhours="3" rqdgpa="2.0"><div class="reqTitle">GEN GPA route</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="4001"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="NEEDS"><div class="reqTitle">Choose one approved GEN course</div><div class="reqNeeds"><span class="count">1</span></div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="4101"></span><span class="course" department="1GEN" number="4102"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO category_Total_Hours" rname="TOTAL" rqdhours="120"><div class="reqTitle">Minimum total degree credits</div><div class="reqBody"></div></div>
 <div class="requirement Status_NO" rname="P-DEGREE"><div class="reqTitle">You must complete at least 120 credits. This includes all University of Minnesota and transfer credits.</div></div>
 <div class="requirement Status_NO" rname="P-GPA"><div class="reqTitle">You need a 2.00 GPA in University of Minnesota coursework upon graduating. This includes credits from all University of Minnesota campuses and excludes transfer credits.</div></div>
 <div class="requirement Status_NO" rname="P-RES"><div class="reqTitle">You must complete at least 30 credits through University of Minnesota Twin Cities and Rochester.</div></div>
 <div class="requirement Status_NO" rname="P-FINAL"><div class="reqTitle">You must complete at least 15 of your last 30 credits through University of Minnesota.</div></div>
 <div class="requirement Status_NO" rname="P-MAJOR"><div class="reqTitle">You need at least 78 credits in this major. This GPA includes all major credits, including transfer credits.</div></div>
 <div class="requirement Status_NO" rname="P-UPPER"><div class="reqTitle">You must complete at least 19 upper-division (3xxx-level or higher) credits for this major through University of Minnesota Twin Cities.</div></div>
 <div class="requirement Status_NO" rname="P-DES"><div class="reqTitle">Of the 23 credits required for Technical Electives, 11 must have a CSCI designator.</div></div>
 <div class="requirement Status_NO" rname="P-QUAL"><div class="reqTitle">Biological Sciences with lab or field experience</div></div>
 <div class="requirement Status_NO" rname="P-SCOPE"><div class="reqTitle">Credits used to meet this degree's liberal education, collegiate, and major requirements.</div></div>
 <div class="requirement Status_NO" rname="UNSUPPORTED"><div class="reqTitle">Residency policy requires institutional review</div><div class="reqBody"></div></div>
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
  assert.equal(summary.totalActiveRemainingRequirements,19,name);
  assert.equal(summary.strictSupportedRequirements,7,name);
  assert.equal(summary.candidateRouteSupportedRequirements,1,name);
  assert.equal(summary.policyConstraints,10,name);
  assert.equal(summary.recognizedPolicyRules,9,name);
  assert.equal(summary.unclassifiedPolicyConstraints,1,name);
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
  const profile=parseAPAS(dom.window.document),summary=analyzeRequirementRouteCoverage(profile).overall;
  assert.deepEqual(
   {
    total:summary.totalActiveRemainingRequirements,
    strict:summary.strictSupportedRequirements,
    candidate:summary.candidateRouteSupportedRequirements,
    policy:summary.policyConstraints,
    unknown:summary.unknownUnroutedRequirements
   },
   {total:19,strict:7,candidate:1,policy:10,unknown:1}
  );
  assert.equal(summary.recognizedPolicyRules,9);
  assert.equal(summary.unclassifiedPolicyConstraints,1);
  assert.equal(summary.breakdown.candidateOnly,1);
  assert.equal(summary.breakdown.gpa,2);
  assert.equal(summary.breakdown.unknown,1);

  const byCode=new Map(flattenRequirements(profile.requirements).map(r=>[r.code,r]));
  const exclusion=byCode.get('EXCLUDE')!,gpa=byCode.get('GPA')!,needs=byCode.get('NEEDS')!,cap=byCode.get('CAP')!,unsupported=byCode.get('UNSUPPORTED')!;
  assert.equal(exclusion.rule.type,'count');
  assert.equal(matches(exclusion.rule,syntheticCourse('EXCL 3201')),'yes');
  assert.equal(matches(exclusion.rule,syntheticCourse('EXCL 3202')),'no','explicit exclusion overrides the matching 3xxx range');
  assert.equal(matches(gpa.rule,syntheticCourse('GEN 4001')),'yes');
  assert.equal(matches(gpa.rule,syntheticCourse('GEN 4002')),'no');
  assert.equal(matches(needs.rule,syntheticCourse('GEN 4101')),'yes');
  assert.equal(matches(needs.rule,syntheticCourse('GEN 4102')),'yes');
  assert.equal(degreeFit(syntheticCourse('GEN 3001'),profile).some(x=>x.requirementId===cap.id&&x.result==='yes'),false,'capped pool is never promoted to strict');
  assert.equal(degreeCandidateFit(syntheticCourse('GEN 3001'),profile).some(x=>x.requirementId===cap.id&&x.result==='yes'&&!x.strict),true,'capped pool remains visible as candidate-only');
  assert.equal(degreeFit(syntheticCourse('EXCL 3202'),profile).some(x=>x.requirementId===exclusion.id&&x.result==='yes'),false);
  const discovery=degreeDiscoveryPlan(profile,'UMNTC');
  assert.ok(discovery.subjects.includes('EXCL'));
  for(const code of ['P-DEGREE','P-GPA','P-RES','P-FINAL','P-MAJOR','P-UPPER','P-DES','P-QUAL','P-SCOPE'])assert.equal(byCode.get(code)?.rule.type,'policy',code);
  assert.equal(unsupported.rule.type,'unknown');
  assert.equal(degreeFit(syntheticCourse('RES 3001'),profile).some(x=>x.requirementId===unsupported.id&&x.result==='yes'),false,'unsupported policy never authorizes a course');
 }finally{dom.window.close();}
});
