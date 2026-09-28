import{test}from'node:test';import assert from'node:assert/strict';import{JSDOM}from'jsdom';
import{academicProfile,preferences,savedPlans,readableStorage,storedJSON}from'../packages/storage/validation.ts';import{parseAPAS}from'../packages/apas-parser/index.ts';import{APAS_MATRIX_FIXTURES}from'./fixtures/apas-matrix.ts';
const sample=()=>{const dom=new JSDOM(APAS_MATRIX_FIXTURES[0].html);try{return parseAPAS(dom.window.document);}finally{dom.window.close();}};
test('legacy synthetic APAS shapes migrate without inventing authority',()=>{
 for(const f of APAS_MATRIX_FIXTURES){const dom=new JSDOM(f.html);try{const p=parseAPAS(dom.window.document),m=academicProfile(p);assert.ok(m,f.name);assert.equal(m.schemaVersion,1);assert.deepEqual(m.requirements,JSON.parse(JSON.stringify(p.requirements)));assert.deepEqual(m.completedCourses,JSON.parse(JSON.stringify(p.completedCourses)));}finally{dom.window.close();}}
});
test('malformed, future-version, identity-bearing and deeply nested profiles fail closed',()=>{
 const p=sample();for(const value of [null,[],{...p,schemaVersion:2},{...p,studentName:'PRIVATE_TEST_IDENTITY'},{...p,requirements:{}},{...p,completedCourses:[{status:'completed',courseCode:'garbage'}]},{...p,degreeCredits:{remaining:-1}}])assert.equal(academicProfile(value),undefined);
 const deep=sample();let rule:any={type:'course',code:'PSY 1001'};for(let i=0;i<30;i++)rule={type:'allOf',rules:[rule]};deep.requirements[0].rule=rule;assert.equal(academicProfile(deep),undefined);
 assert.equal(academicProfile(JSON.parse('{"__proto__":{"authorized":true}}')),undefined);
});
test('poisoned preferences and saved plans do not escape bounded defaults',()=>{
 const p=preferences({minCredits:-9,maxCredits:999,fewestDays:'false',allowWaitlist:'true',planningGoal:'magic',earliestTime:'99:99',preferredInstructors:['ok',{}]});assert.equal(p.minCredits,3);assert.equal(p.maxCredits,12);assert.equal(p.allowWaitlist,undefined);assert.equal(p.earliestTime,undefined);assert.deepEqual(p.preferredInstructors,['ok']);
 assert.deepEqual(savedPlans({length:1}),[]);assert.deepEqual(savedPlans([{name:'bad',term:'1273',schedule:{courses:{},sections:[]}}]),[]);
});

test('future storage versions are preserved and oversized stored JSON is ignored',()=>{assert.equal(readableStorage(null),true);assert.equal(readableStorage('1'),true);assert.equal(readableStorage('2'),false);assert.equal(storedJSON('{bad'),undefined);assert.equal(storedJSON('[]',1),undefined);});

test('public SQLite upgrades legacy cache schema and rejects a future schema without downgrade',async()=>{
 const{Store}=await import('../packages/providers/store.ts');const{DatabaseSync}=await import('node:sqlite');const{mkdtemp,rm}=await import('node:fs/promises');const{tmpdir}=await import('node:os');const{join}=await import('node:path');const dir=await mkdtemp(join(tmpdir(),'smart-umn-schema-')),file=join(dir,'cache.sqlite');
 try{const store=new Store(file);assert.equal(store.db.prepare('PRAGMA user_version').get()!.user_version,1);store.close();const db=new DatabaseSync(file);db.exec('PRAGMA user_version=2');db.close();assert.throws(()=>new Store(file),/newer/);const after=new DatabaseSync(file);assert.equal(after.prepare('PRAGMA user_version').get()!.user_version,2);after.close();}finally{await rm(dir,{recursive:true,force:true});}
});
