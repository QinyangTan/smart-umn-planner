import{test}from'node:test';
import assert from'node:assert/strict';
import{Store}from'../packages/providers/store.ts';
import{GopherGradesProvider}from'../packages/providers/index.ts';

const valid={success:true,data:{dept_abbr:'PSY',course_num:'1001',total_students:1,total_grades:{A:1},distributions:[{professor_name:'Fixture Instructor',terms:[{term:'1263',students:1,grades:{A:1}}]}]}};

test('record-level GopherGrades 404 does not poison provider-wide health',async()=>{
 const store=new Store(':memory:');
 const fetcher=(async(input:RequestInfo|URL)=>String(input).includes('PSY1001')?new Response(JSON.stringify(valid),{status:200,headers:{'content-type':'application/json'}}):new Response('',{status:404})) as typeof fetch;
 const gg=new GopherGradesProvider(store,fetcher);
 try{
  const good=await gg.fetch('PSY 1001');assert.equal(good.health.status,'healthy');
  assert.equal(store.healthList().find(h=>h.source==='gophergrades')?.status,'healthy');
  const missing=await gg.fetch('CSCI 9999');assert.equal(missing.data,null);assert.equal(missing.health.status,'down');assert.equal(missing.health.message,'HTTP 404');
  const global=store.healthList().find(h=>h.source==='gophergrades');assert.equal(global?.status,'healthy','a missing course record must not mark the whole provider down');
  const probe=await gg.healthCheck();assert.equal(probe.status,'healthy');assert.equal(store.healthList().find(h=>h.source==='gophergrades')?.status,'healthy');
 }finally{store.close();}
});
