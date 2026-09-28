import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import seed from'../config/public-evidence-seed.json'with{type:'json'};

process.env.PUBLIC_ORIGIN='https://smart-umn-planner.netlify.app';
process.env.EXTENSION_IDS='cleikpoiflloemienikmmmedkniblobc';
const netlifyModule=await import('../netlify/functions/api.mts');const handler=netlifyModule.default;
const ctx={ip:'203.0.113.10'} as any;
const call=(path:string,init?:RequestInit)=>handler(new Request('https://smart-umn-planner.netlify.app'+path,init),ctx);

test('Netlify build publishes the reviewed extension archive with the Web',()=>{const toml=readFileSync('netlify.toml','utf8');assert.match(toml,/command\s*=\s*"npm run package:extension"/);});
test('Netlify edge rate limit protects every API path before function execution',()=>{const c=netlifyModule.config as any;assert.deepEqual(c.rateLimit,{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']});assert.equal(c.path,'/api/*');});
test('Netlify seed contains only reviewed public evidence',()=>{
 assert.equal(seed.schemaVersion,1);assert.equal(seed.snapshots.length,6);assert.equal(seed.community.length,2);
 assert.ok(seed.snapshots.every(x=>x.key.startsWith('policy:')&&x.payload.url.startsWith('https://')));
 assert.deepEqual(new Set(seed.community.map(x=>x.source)),new Set(['ratemyprofessor','reddit']));
 const forbidden=/^(student|studentId|student_id|internetId|x500|cookie|cookies|saml|duo|password|completedCourses|inProgressCourses|transferCourses|savedPlans|academicProfile|apasHtml)$/i,hits:string[]=[];
 const walk=(value:any,path:string[]=[]):void=>{if(Array.isArray(value))return void value.forEach((x,i)=>walk(x,[...path,String(i)]));if(value&&typeof value==='object')for(const[k,v]of Object.entries(value)){if(forbidden.test(k))hits.push([...path,k].join('.'));walk(v,[...path,k]);}};
 walk(seed);assert.deepEqual(hits,[]);
});
test('Netlify health is public and student writes stay rejected',async()=>{
 const h=await call('/api/health');assert.equal(h.status,200);const body=await h.json() as any;assert.equal(body.serverless,true);assert.equal(body.cache,'ephemeral-public');
 const bad=await call('/api/student/context',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(bad.status,404);assert.match(JSON.stringify(await bad.json()),/Private academic data/);
});
test('Netlify origin boundary rejects cross-site and policy evidence stays review-only',async()=>{
 const hostile=await handler(new Request('https://smart-umn-planner.netlify.app/api/health',{headers:{origin:'https://evil.example'}}),ctx);assert.equal(hostile.status,403);
 const p=await call('/api/policy/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'120 credits are required for the degree',campus:'UMNTC'})});assert.equal(p.status,200);const body=await p.json() as any;assert.equal(body.decisionAuthority,'none');assert.ok(Array.isArray(body.evidence)&&body.evidence.length>0);assert.ok(body.evidence.every((x:any)=>String(x.sourceRef||'').startsWith('https://')));
});
