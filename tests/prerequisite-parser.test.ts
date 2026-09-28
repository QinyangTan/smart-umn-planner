import{test}from'node:test';import assert from'node:assert/strict';
import{parsePrerequisites,prerequisiteRuleCoverage}from'../packages/core/rules.ts';

test('same-subject omitted prerequisite number uses explicit current-course subject context',()=>{
 const r=parsePrerequisites('prereq: 8201','UMNTC','AEM');
 assert.deepEqual(r,{type:'course',code:'AEM 8201',campus:'UMNTC'});
 assert.equal(prerequisiteRuleCoverage(r),'deterministic');
});

test('numeric prerequisite without current subject stays review-only',()=>{
 const r=parsePrerequisites('prereq: 8201','UMNTC');
 assert.equal(r.type,'unknown');
 assert.equal(prerequisiteRuleCoverage(r),'review');
});

test('top-level comma-separated course list is deterministic AND',()=>{
 const r=parsePrerequisites('Prereq: CEGE 3103, CEGE 4101W, CEGE 4401, CEGE 4501','UMNTC','CEGE');
 assert.equal(r.type,'allOf');
 if(r.type==='allOf')assert.deepEqual(r.rules.map(x=>x.type==='course'?x.code:x.type),['CEGE 3103','CEGE 4101W','CEGE 4401','CEGE 4501']);
 assert.equal(prerequisiteRuleCoverage(r),'deterministic');
});

test('bracketed same-subject OR group supports a shared minimum letter grade',()=>{
 const r=parsePrerequisites('prereq: [1272 or 1372 or 1572] w/grade of at least C-','UMNTC','MATH');
 assert.equal(r.type,'anyOf');
 if(r.type==='anyOf')assert.deepEqual(r.rules.map(x=>x.type==='course'?{code:x.code,minimumGrade:x.minimumGrade}:x.type),[
  {code:'MATH 1272',minimumGrade:'C-'},{code:'MATH 1372',minimumGrade:'C-'},{code:'MATH 1572',minimumGrade:'C-'}
 ]);
 assert.equal(prerequisiteRuleCoverage(r),'deterministic');
});

test('prefix minimum-grade phrasing is normalized only for explicit letter grades',()=>{
 const r=parsePrerequisites('prereq: Grade of A in 3022','UMNTC','JPN');
 assert.deepEqual(r,{type:'course',code:'JPN 3022',campus:'UMNTC',minimumGrade:'A'});
 assert.equal(prerequisiteRuleCoverage(r),'deterministic');
});

test('trailing punctuation does not turn a plain course prerequisite into review-only',()=>{
 const r=parsePrerequisites('Prereq: ARTS 1801.','UMNTC','ARTS');
 assert.deepEqual(r,{type:'course',code:'ARTS 1801',campus:'UMNTC'});
});

test('mixed course and consent conditions remain partially structured, never fully deterministic',()=>{
 const r=parsePrerequisites('prereq: 8814, instr consent','UMNTC','PSY');
 assert.equal(r.type,'allOf');
 assert.equal(prerequisiteRuleCoverage(r),'partial');
});

test('pure consent remains review-only',()=>{
 const r=parsePrerequisites('prereq: instr consent','UMNTC','CSCI');
 assert.equal(r.type,'unknown');
 assert.equal(prerequisiteRuleCoverage(r),'review');
});

test('explicit cross-subject course survives alongside same-subject omitted number',()=>{
 const r=parsePrerequisites('prereq: 2001, Phys 2601','UMNTC','AST');
 assert.equal(r.type,'allOf');
 if(r.type==='allOf')assert.deepEqual(r.rules.map(x=>x.type==='course'?x.code:x.type),['AST 2001','PHYS 2601']);
 assert.equal(prerequisiteRuleCoverage(r),'deterministic');
});

test('major restriction after proven course prerequisites remains partial',()=>{
 const r=parsePrerequisites('prereq: [JOUR 3004 or 3004H], JOUR 3201, Strat Comm major','UMNTC','JOUR');
 assert.equal(r.type,'allOf');
 assert.equal(prerequisiteRuleCoverage(r),'partial');
});

test('an entirely recommended course is not promoted into a hard prerequisite',()=>{const r=parsePrerequisites('prereq: 3301 recommended','UMNTC','AIR');assert.deepEqual(r,{type:'allOf',rules:[]});});

test('Recommended Prereq wording is treated as advisory rather than enrollment eligibility',()=>{const r=parsePrerequisites('Recommended Prereq: Completion of 30 credits','UMNTC','ABUS');assert.deepEqual(r,{type:'allOf',rules:[]});});

test('a semicolon-delimited recommendation does not block a proven required prerequisite',()=>{const r=parsePrerequisites('prereq: FREN 3015; completion of 3016 recommended','UMNTC','FREN');assert.deepEqual(r,{type:'course',code:'FREN 3015',campus:'UMNTC'});});

test('historical previous-course annotation is not interpreted as a second prerequisite',()=>{const r=parsePrerequisites('Prereq: MBA 6231 (previously MBA 6230)','UMNTC','FINA');assert.deepEqual(r,{type:'course',code:'MBA 6231',campus:'UMNTC'});});

test('ambiguous comma-scoped recommendation stays review-only instead of guessing modifier scope',()=>{const r=parsePrerequisites('prereq: 3001, 3006 recommended','UMNTC','APEC');assert.notEqual(prerequisiteRuleCoverage(r),'deterministic');});
