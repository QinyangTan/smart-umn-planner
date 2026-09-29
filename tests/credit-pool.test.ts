import test from'node:test';import assert from'node:assert/strict';import{JSDOM}from'jsdom';
import{parseAPAS}from'../packages/apas-parser/index.ts';
import{degreeFit}from'../packages/core/rules.ts';
import type{Course}from'../packages/schemas/index.ts';

const list=(codes:string[])=>`<table class="selectcourses"><tbody><tr>${codes.map(c=>{const[d,n]=c.split(' ');return`<td><span class="course" department="1${d}" number="${n}"></span></td>`;}).join('')}</tr></tbody></table>`;
const sub=(title:string,codes:string[],attrs='maxhours="999.90"',status='Status_NONE')=>`<div class="subrequirement" ${attrs}><div class="subreqPretext"><span class="status ${status}"></span></div><div class="subreqTitle">${title}</div>${list(codes)}</div>`;
function audit(parentTitle:string,children:string,needs=11){return new JSDOM(`<div id="audit"><div class="card-header"><h2>Synthetic Pool BS</h2></div>
<div class="requirement Status_NO" rname="POOL" rqdhours="23.00" maxhours="999.00"><div class="reqTitle">${parentTitle}</div><div class="reqNeeds"><span class="hours">${needs}</span></div>${children}</div>
<table><tbody><tr class="takenCourse"><td class="term">F 25</td><td class="course">1CSCI2041</td><td class="credit">4.00</td><td class="grade">A</td><td class="ccode">Complete</td></tr></tbody></table></div>`).window.document;}
const course=(code:string,credits=3):Course=>{const[subject,catalogNumber]=code.split(' ');return{institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,title:code,description:'',credits,prerequisites:'',prerequisiteRule:{type:'allOf',rules:[]},attributes:[],sectionIds:[],equivalents:[],sourceRefs:{},provenance:{source:'fixture',retrievedAt:'2026-09-28T00:00:00.000Z',period:'1273'}};};

test('aggregate credit pool promotes only the cap-free subset of its child lists',()=>{
 const p=parseAPAS(audit('Technical Electives',
  sub('Upper Division Math Oriented Requirement Take 1 or more courses from the following:',['CSCI 4011','MATH 4242'],'rqdsubreq="1" maxhours="999.90"','Status_NO')+
  sub('Take up to 22 credits from the following list. Note: You may use up to three total credits from CSCI4970w, CSCI5991, and CSCI5994 combined towards your Technical Electives.',['CSCI 5302','CSCI 4970W','CSCI 5991','CSCI 5994','CSCI 4041'],'maxhours="22.00"')+
  sub('GDES and PDES Course Options Take 0-2 courses from the following:',['GDES 3352','PDES 2701'])));
 const r=p.requirements[0];
 assert.equal(r.rule.type,'credits');assert.equal((r.rule as any).minimum,23);
 const d=r.rawMetadata.derivedRule as any;assert.equal(d.kind,'safe-credit-pool');assert.equal(d.remainingCredits,11);
 assert.deepEqual(d.reviewOnlyCourses,['CSCI 4970','CSCI 5991','CSCI 5994']);assert.equal(d.reviewOnlyLists.length,1);assert.match(d.reviewOnlyLists[0],/0-2 courses/);
 const profile={...p};
 const fits=(code:string)=>degreeFit(course(code),profile).some(f=>f.requirementId===r.id&&f.result==='yes');
 for(const ok of['CSCI 5302','CSCI 4041','MATH 4242','CSCI 4011'])assert.ok(fits(ok),ok+' is in the cap-free subset');
 for(const capped of['CSCI 4970W','CSCI 5991','CSCI 5994','GDES 3352','PDES 2701','CSCI 1133'])assert.ok(!fits(capped),capped+' must stay review-only');
});

test('a child list whose own credit cap is below the remaining need is not promoted',()=>{
 const p=parseAPAS(audit('Technical Electives',sub('Take up to 6 credits from the following list.',['CSCI 5302','CSCI 4041'],'maxhours="6.00"'),11));
 assert.equal(p.requirements[0].rule.type,'unknown');
});

test('gated or excepted aggregate pools stay unknown',()=>{
 for(const title of['Technical Electives with advisor approval','Electives except courses used elsewhere']){
  const p=parseAPAS(audit(title,sub('Take courses from the following list.',['CSCI 5302'])));
  assert.equal(p.requirements[0].rule.type,'unknown',title);
 }
 const gatedChild=parseAPAS(audit('Technical Electives',sub('Research credits with department approval.',['CSCI 5991'])));
 assert.equal(gatedChild.requirements[0].rule.type,'unknown','a pool whose only list is gated has nothing safe to promote');
});

test('a satisfied pool (no remaining credits) is not rewritten',()=>{
 const p=parseAPAS(audit('Technical Electives',sub('Take courses from the following list.',['CSCI 5302']),0));
 assert.equal(p.requirements[0].rule.type,'unknown');
});
