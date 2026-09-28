import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{runCanary,classifyProviderFailure,policySeedExpiry}from'../packages/ops/canary.ts';

const origin='https://smartumn.qinyangtan.com',zip=new Uint8Array([80,75,3,4,1,2,3]);
const now=Date.parse('2026-09-29T00:00:00.000Z'),seed={snapshots:[{key:'policy:a',payload:{capturedAt:'2026-09-28T01:00:00.000Z'}},{key:'policy:b',payload:{capturedAt:'2026-09-28T03:00:00.000Z'}}]};
const course={code:'CSCI 1133',title:'Intro',subject:'CSCI',sectionIds:['1'],prerequisiteRule:{type:'none'}};
const section={classNumber:'1',courseCode:'CSCI 1133',meetings:[],instructors:[]};
const grades={courseCode:'CSCI 1133',totalStudents:10,grades:{A:10},distributions:[]};
const ok=(data:unknown)=>({data,stale:false,health:{status:'healthy'}});
const headers={'server':'Netlify','x-nf-request-id':'x','strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
type Routes=Record<string,(init?:RequestInit)=>Response>;
function world(over:Routes={}){
 const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
 const routes:Routes={
  '/':()=>new Response('<title>Smart UMN Planner</title>',{headers}),
  '/privacy.html':()=>new Response('ok'),'/support.html':()=>new Response('ok'),
  '/api/health':init=>new Headers(init?.headers).get('origin')==='https://hostile.invalid'?json({error:'no'},403):json({status:'running',serverless:true,version:'0.10.4',metrics:{requests:5,errors:0}}),
  '/api/health/providers':()=>json({providers:[{source:'umn-schedule-builder',status:'healthy'},{source:'gophergrades',status:'healthy'}]}),
  '/api/courses/CSCI%201133/context':()=>json({course:ok(course),sections:ok([section]),grades:ok(grades),community:[]}),
  '/api/policy/search':()=>json({decisionAuthority:'none',evidence:[{sourceType:'official-umn',sourceRef:'https://policy.umn.edu/education/bacreditreq'}]}),
  '/smart-umn-extension.zip':()=>new Response(zip),
  ...over};
 const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{const path=String(input).slice(origin.length);const r=routes[path];if(!r)throw Error('unexpected '+path);return r(init);}) as typeof fetch;
 return{origin,expectedVersion:'0.10.4',releaseZip:zip,seed,now,fetcher,resolveCname:async()=>['smart-umn-planner.netlify.app.'],certificateExpiry:async()=>now+60*86400000,expectedCname:'smart-umn-planner.netlify.app'};
}
const find=(r:Awaited<ReturnType<typeof runCanary>>,id:string)=>r.checks.find(c=>c.id===id)!;

test('healthy canonical production passes every canary check',async()=>{
 const r=await runCanary(world());assert.equal(r.ok,true,JSON.stringify(r.checks.filter(c=>c.status!=='pass')));
 assert.ok(r.checks.length>=20);
});
test('provider outage and schema drift are reported as different categories',async()=>{
 assert.equal(classifyProviderFailure('HTTP 503'),'provider-outage');assert.equal(classifyProviderFailure('Upstream timeout'),'provider-outage');
 assert.equal(classifyProviderFailure('Schedule Builder schema mismatch'),'schema-drift');
 const outage=await runCanary(world({'/api/courses/CSCI%201133/context':()=>Response.json({course:{data:null,health:{status:'down',message:'HTTP 503'}},sections:ok([section]),grades:ok(grades),community:[]})}));
 assert.equal(outage.ok,false);assert.deepEqual([find(outage,'course:schedule-builder').category,find(outage,'course:schedule-builder').status],['provider-outage','fail']);
 const drift=await runCanary(world({'/api/courses/CSCI%201133/context':()=>Response.json({course:ok({code:'CSCI 1133'}),sections:ok([section]),grades:ok(grades),community:[]})}));
 assert.deepEqual([find(drift,'course:schedule-builder').category,find(drift,'course:schedule-builder').status],['schema-drift','fail']);
});
test('optional GopherGrades outage warns without failing, but its schema drift fails',async()=>{
 const outage=await runCanary(world({'/api/health/providers':()=>Response.json({providers:[{source:'umn-schedule-builder',status:'healthy'},{source:'gophergrades',status:'down',message:'HTTP 502'}]}),'/api/courses/CSCI%201133/context':()=>Response.json({course:ok(course),sections:ok([section]),grades:{data:null,health:{status:'down',message:'HTTP 502'}},community:[]})}));
 assert.equal(outage.ok,true);assert.equal(find(outage,'grades:gophergrades').status,'warn');assert.equal(find(outage,'provider:gophergrades').status,'warn');
 const drift=await runCanary(world({'/api/courses/CSCI%201133/context':()=>Response.json({course:ok(course),sections:ok([section]),grades:ok({courseCode:'CSCI 1133'}),community:[]})}));
 assert.equal(drift.ok,false);assert.equal(find(drift,'grades:gophergrades').category,'schema-drift');
});
test('package, security, routing and rate-limit regressions fail explicitly',async()=>{
 const zipMismatch=await runCanary(world({'/smart-umn-extension.zip':()=>new Response(new Uint8Array([1]))}));assert.equal(find(zipMismatch,'extension-zip').status,'fail');
 const hostile=await runCanary(world({'/api/health':()=>Response.json({status:'running',serverless:true,version:'0.10.4'})}));assert.equal(find(hostile,'hostile-origin').status,'fail');
 const authority=await runCanary(world({'/api/policy/search':()=>Response.json({decisionAuthority:'eligible',evidence:[]})}));assert.equal(find(authority,'policy-authority').status,'fail');
 const rollback=await runCanary({...world(),resolveCname:async()=>['d3d8090b-2935-4862-ad10-ab90540a9c3f.cfargotunnel.com']});assert.equal(find(rollback,'dns-route').status,'fail');
 const stale=await runCanary(world({'/api/health':()=>Response.json({status:'running',serverless:true,version:'0.10.3'})}));assert.equal(find(stale,'deployed-version').status,'fail');
 const busy=await runCanary(world({'/api/health/providers':()=>Response.json({error:'busy'},{status:429})}));assert.equal(find(busy,'rate-limit').status,'fail');
 const tls=await runCanary({...world(),certificateExpiry:async()=>now+3*86400000});assert.equal(find(tls,'tls-certificate').status,'fail');
 const noHsts=await runCanary(world({'/':()=>new Response('Smart UMN',{headers:{...headers,'strict-transport-security':''}})}));assert.equal(find(noHsts,'security-headers').status,'fail');
});
test('policy seed expiry warns early and fails before official evidence silently disappears',async()=>{
 assert.equal(policySeedExpiry(seed).expiresAt,'2026-10-05T01:00:00.000Z');
 const early=await runCanary({...world(),now:Date.parse('2026-10-02T00:00:00.000Z'),certificateExpiry:async()=>Date.parse('2026-12-01T00:00:00.000Z')});assert.equal(find(early,'policy-seed-expiry').status,'warn');assert.equal(early.ok,true);
 const late=await runCanary({...world(),now:Date.parse('2026-10-04T00:00:00.000Z'),certificateExpiry:async()=>Date.parse('2026-12-01T00:00:00.000Z')});assert.equal(find(late,'policy-seed-expiry').status,'fail');
 const empty=await runCanary(world({'/api/policy/search':()=>Response.json({decisionAuthority:'none',evidence:[]})}));assert.equal(find(empty,'policy-live-evidence').category,'policy-freshness');assert.equal(empty.ok,false);
});
test('canary sends no student data or credentials',()=>{
 const src=readFileSync('packages/ops/canary.ts','utf8');
 assert.doesNotMatch(src,/['"](cookie|authorization)['"]\s*:/i);
 assert.doesNotMatch(src,/completedCourses|academicProfile|apasHtml|localStorage/);
});
