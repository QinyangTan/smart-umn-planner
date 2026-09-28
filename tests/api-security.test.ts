import{test}from'node:test';import assert from'node:assert/strict';
import{spawn}from'node:child_process';import{createServer,request}from'node:http';import{mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{once}from'node:events';
import{plannerOrigin}from'../packages/config/origin.ts';import{serverConfig,requestAllowed,RequestBudget}from'../apps/api/security.ts';
test('production origins must be exact HTTPS and extension IDs must be explicitly allowlisted',()=>{
 for(const value of ['http://planner.example','https://planner.example/path','https://u:p@planner.example','https://planner.example?x=1','javascript:alert(1)'])assert.throws(()=>plannerOrigin(value));
 assert.throws(()=>serverConfig({NODE_ENV:'production'}));
 const config=serverConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'https://planner.example',EXTENSION_IDS:'a'.repeat(32)});
 const allowed=(host:string,origin?:string,site?:string)=>requestAllowed({headers:{host,origin,'sec-fetch-site':site}} as any,config);
 assert.ok(allowed('planner.example','https://planner.example'));
 assert.ok(allowed('planner.example','chrome-extension://'+'a'.repeat(32)));
 for(const origin of ['null','https://planner.example.evil','http://planner.example','chrome-extension://'+'b'.repeat(32)])assert.equal(allowed('planner.example',origin),false);
 assert.equal(allowed('localhost:4317'),false);assert.equal(allowed('planner.example',undefined,'cross-site'),false);
});
test('request budgets bound individual clients, aggregate load and key memory',()=>{
 const budget=new RequestBudget(2,4,2);assert.ok(budget.take('a',100000));assert.ok(budget.take('a',100000));assert.equal(budget.take('a',100000),false);assert.ok(budget.take('b',100000));assert.equal(budget.take('c',100000),false);assert.ok(budget.take('c',161000));
});
test('real HTTP boundary rejects hostile origins, private payloads, malformed JSON and excessive bodies',async()=>{
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as any).port;await new Promise<void>(r=>socket.close(()=>r()));
 const dir=await mkdtemp(join(tmpdir(),'smart-umn-api-'));
 const child=spawn(process.execPath,['apps/api/server.ts'],{env:{...process.env,NODE_ENV:'production',PUBLIC_ORIGIN:'https://planner.example',PORT:String(port),PLANNER_DB:join(dir,'cache.sqlite'),SMART_UMN_EMBEDDINGS:'off'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>{output+=b});child.stderr.on('data',b=>{output+=b});
 try{
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('API startup timeout')),10000).unref())]);
  const call=(path:string,body?:string,headers:Record<string,string>={})=>new Promise<{status:number;body:string;headers:any}>((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,method:body===undefined?'GET':'POST',headers:{host:'planner.example',...(body===undefined?{}:{'Content-Type':'application/json'}),...headers}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode!,body:text,headers:res.headers}));});req.on('error',reject);req.end(body);});
  const health=await call('/api/health');assert.equal(health.status,200);assert.equal(JSON.parse(health.body).localOnly,false);
  assert.equal((await call('/api/health',undefined,{origin:'https://evil.example'})).status,403);
  assert.equal((await call('/api/health',undefined,{host:'evil.example'})).status,403);
  const marker='PRIVATE_TEST_MARKER';
  assert.equal((await call('/api/student/context',JSON.stringify({rawHTML:marker}))).status,404);
  assert.equal((await call('/api/course-context/batch',JSON.stringify({codes:[],term:'1273'}))).status,400);
  assert.equal((await call('/api/course-context/batch','{')).status,400);
  assert.equal((await call('/api/course-context/batch','x'.repeat(33000))).status,413);
  assert.equal((await call('/api/course-context/batch','{}',{'Content-Type':'text/plain'})).status,415);
  assert.equal((await call('/api/course-context/batch',JSON.stringify({codes:['PSY 1001'],term:'1273',profile:marker}))).status,400);
  assert.ok(!output.includes(marker));assert.ok(!(await call('/api/health')).body.includes(marker));
 }finally{child.kill('SIGTERM');await once(child,'exit');await rm(dir,{recursive:true,force:true});}
});
