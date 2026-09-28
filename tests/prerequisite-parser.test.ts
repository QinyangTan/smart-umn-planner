import{test}from'node:test';import assert from'node:assert/strict';
import{parsePrerequisites,prerequisiteReviewSummary,prerequisiteRuleCoverage}from'../packages/core/rules.ts';

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

test('pure consent becomes a typed review-only condition',()=>{
 const r=parsePrerequisites('prereq: instr consent','UMNTC','CSCI');
 assert.equal(r.type,'condition');if(r.type==='condition'){assert.equal(r.family,'consent');assert.deepEqual(r.parameters.authorities,['instructor']);}
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

test('high-frequency consent and standing phrases become typed non-executable conditions',()=>{const r=parsePrerequisites("prereq: Master's student, adviser and DGS consent",'UMNTC','ANSC');assert.equal(r.type,'allOf');assert.equal(prerequisiteRuleCoverage(r),'review');if(r.type==='allOf')assert.deepEqual(r.rules.map(x=>x.type==='condition'?x.family:x.type),['standing','consent','consent']);assert.match(prerequisiteReviewSummary(r),/Masters standing.*Adviser consent.*DGS consent/);});

test('audition plus department consent stays review-only but becomes explainable',()=>{const r=parsePrerequisites('prereq: Audition, dept consent','UMNTC','MUSA');assert.equal(prerequisiteRuleCoverage(r),'review');assert.match(prerequisiteReviewSummary(r),/Audition required.*Department consent required/);});

test('graduate standing or instructor consent preserves OR semantics',()=>{const r=parsePrerequisites('prereq: Grad student or instr consent','UMNTC','BBE');assert.equal(r.type,'anyOf');assert.equal(prerequisiteRuleCoverage(r),'review');assert.match(prerequisiteReviewSummary(r),/Graduate standing requires confirmation OR Instructor consent required/);});

test('minimum completed-credit threshold is typed but not auto-satisfied',()=>{const r=parsePrerequisites('prereq: 45 cr completed','UMNTC','ABUS');assert.equal(r.type,'condition');if(r.type==='condition'){assert.equal(r.family,'minimum-earned-credits');assert.equal(r.parameters.minimumCredits,45);}assert.equal(prerequisiteRuleCoverage(r),'review');});

test('concurrent registration condition records the same-subject target without auto-satisfying it',()=>{const r=parsePrerequisites('prereq: concurrent registration is required (or allowed) in 4161W','UMNTC','EE');assert.equal(r.type,'condition');if(r.type==='condition'){assert.equal(r.family,'concurrent-registration');assert.equal(r.parameters.course,'EE 4161W');}assert.equal(prerequisiteRuleCoverage(r),'review');assert.match(prerequisiteReviewSummary(r),/Concurrent registration in EE 4161W required/);});

test('program and honors restrictions become typed review conditions',()=>{const program=parsePrerequisites('prereq: Carlson School of Management student','UMNTC','BA'),honors=parsePrerequisites('prereq: Honors student','UMNTC','ARTS');assert.equal(program.type,'condition');assert.equal(honors.type,'condition');if(program.type==='condition')assert.equal(program.family,'program-membership');if(honors.type==='condition')assert.equal(honors.family,'honors');assert.equal(prerequisiteRuleCoverage(program),'review');assert.equal(prerequisiteRuleCoverage(honors),'review');});
