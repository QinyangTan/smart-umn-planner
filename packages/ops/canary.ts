import{createHash}from'node:crypto';

// Production canary: public evidence and canonical-host checks only.
// It never sends APAS data, credentials, cookies or student-specific text.
export type CanaryCategory='canonical'|'security'|'package'|'provider-outage'|'schema-drift'|'policy-freshness'|'rate-limit'|'optional-source';
export type CanaryCheck={id:string;category:CanaryCategory;status:'pass'|'warn'|'fail';detail:string};
export type CanaryDeps={
 origin:string;expectedVersion:string;releaseZip:Uint8Array;seed:{snapshots:{key:string;payload:{capturedAt?:string}}[]};
 fetcher?:typeof fetch;now?:number;
 resolveCname?:(host:string)=>Promise<string[]>;
 certificateExpiry?:(host:string)=>Promise<number>;
 expectedCname?:string;
};
export const POLICY_MAX_AGE_MS=7*86400000; // mirrors policyDocumentsFromSnapshots fail-closed window
const DAY=86400000;
const REQUIRED_HEADERS:[string,RegExp][]=[['strict-transport-security',/max-age=\d{7,}/],['content-security-policy',/default-src 'self'.*script-src 'self'.*object-src 'none'.*frame-ancestors 'none'/],['x-content-type-options',/^nosniff$/i],['referrer-policy',/^no-referrer$/i]];
const PROVIDER_REQUIRED=new Set(['umn-schedule-builder']);

export function classifyProviderFailure(message=''):'schema-drift'|'provider-outage'{return/schema|mismatch|invalid|unexpected|normaliz/i.test(message)?'schema-drift':'provider-outage';}

export function policySeedExpiry(seed:CanaryDeps['seed']):{oldest:string|null;expiresAt:string|null}{
 const times=seed.snapshots.filter(s=>s.key.startsWith('policy:')).map(s=>Date.parse(String(s.payload.capturedAt))).filter(Number.isFinite);
 if(!times.length)return{oldest:null,expiresAt:null};
 const oldest=Math.min(...times);return{oldest:new Date(oldest).toISOString(),expiresAt:new Date(oldest+POLICY_MAX_AGE_MS).toISOString()};
}

const isCourse=(x:any)=>x&&typeof x.code==='string'&&typeof x.title==='string'&&typeof x.subject==='string'&&Array.isArray(x.sectionIds)&&x.prerequisiteRule&&typeof x.prerequisiteRule==='object';
const isSection=(x:any)=>x&&typeof x.classNumber==='string'&&typeof x.courseCode==='string'&&Array.isArray(x.meetings)&&Array.isArray(x.instructors);
const isGrades=(x:any)=>x&&typeof x.courseCode==='string'&&typeof x.totalStudents==='number'&&x.grades&&typeof x.grades==='object'&&Array.isArray(x.distributions);

export async function runCanary(d:CanaryDeps):Promise<{checkedAt:string;origin:string;ok:boolean;checks:CanaryCheck[]}>{
 const f=d.fetcher||fetch,now=d.now??Date.now(),checks:CanaryCheck[]=[],host=new URL(d.origin).host;
 const add=(id:string,category:CanaryCategory,status:CanaryCheck['status'],detail:string)=>{checks.push({id,category,status,detail});};
 let throttled=0;
 const get=async(path:string,init:RequestInit={})=>{const r=await f(d.origin+path,{redirect:'manual',...init,headers:{'user-agent':'smart-umn-production-canary',...(init.headers||{})}});if(r.status===429)throttled++;return r;};

 // DNS route: canonical should CNAME to Netlify, not the retained rollback tunnel.
 if(d.resolveCname&&d.expectedCname){
  try{const c=(await d.resolveCname(host)).map(x=>x.replace(/\.$/,'').toLowerCase());add('dns-route','canonical',c.includes(d.expectedCname)?'pass':'fail',`CNAME ${c.join(',')||'(none)'}`);}
  catch(e){add('dns-route','canonical','fail','DNS lookup failed: '+(e instanceof Error?e.message:String(e)));}
 }
 if(d.certificateExpiry){
  try{const left=(await d.certificateExpiry(host)-now)/DAY;add('tls-certificate','canonical',left<7?'fail':left<21?'warn':'pass',`certificate expires in ${left.toFixed(1)} days`);}
  catch(e){add('tls-certificate','canonical','fail','TLS handshake failed: '+(e instanceof Error?e.message:String(e)));}
 }

 try{
  const home=await get('/');const text=await home.text();
  add('home','canonical',home.status===200&&/Smart UMN/i.test(text)?'pass':'fail',`HTTP ${home.status}`);
  add('netlify-edge','canonical',/netlify/i.test(home.headers.get('server')||'')&&home.headers.get('x-nf-request-id')?'pass':'fail',`server=${home.headers.get('server')}`);
  const missing=REQUIRED_HEADERS.filter(([h,re])=>!re.test(home.headers.get(h)||'')).map(([h])=>h);
  add('security-headers','security',missing.length?'fail':'pass',missing.length?'missing/weak: '+missing.join(', '):'HSTS, CSP, nosniff, no-referrer present');
 }catch(e){add('home','canonical','fail','request failed: '+(e instanceof Error?e.message:String(e)));}

 for(const page of['privacy.html','support.html']){try{const r=await get('/'+page);add(page,'canonical',r.status===200?'pass':'fail',`HTTP ${r.status}`);}catch(e){add(page,'canonical','fail',String(e));}}

 try{
  const r=await get('/api/health');const h:any=r.status===200?await r.json():null;
  add('api-health','canonical',h?.status==='running'&&h.serverless===true?'pass':'fail',h?`status=${h.status} serverless=${h.serverless}`:`HTTP ${r.status}`);
  add('deployed-version','canonical',h?.version===d.expectedVersion?'pass':'fail',`live ${h?.version} / expected ${d.expectedVersion}`);
  const e=h?.metrics?.errors,req=h?.metrics?.requests;
  if(typeof e==='number'&&typeof req==='number')add('function-errors','canonical',req>=20&&e/req>0.2?'warn':'pass',`${e} errors / ${req} requests on this instance (per-instance, resets on cold start)`);
 }catch(e){add('api-health','canonical','fail',String(e));}

 try{
  const r=await get('/api/health/providers');const body:any=r.status===200?await r.json():null;
  if(!body||!Array.isArray(body.providers))add('provider-health','canonical','fail',`HTTP ${r.status}`);
  else for(const p of body.providers){
   if(p.status==='healthy'){add('provider:'+p.source,'provider-outage','pass','healthy');continue;}
   const kind=classifyProviderFailure(p.message),required=PROVIDER_REQUIRED.has(p.source);
   add('provider:'+p.source,kind,kind==='schema-drift'||required?'fail':'warn',`${p.status}: ${p.message||'no message'}`);
  }
 }catch(e){add('provider-health','canonical','fail',String(e));}

 // Representative live course context: distinguishes upstream outage from adapter/schema regression.
 try{
  const r=await get('/api/courses/'+encodeURIComponent('CSCI 1133')+'/context');const c:any=r.status===200?await r.json():null;
  if(!c)add('course-context','canonical','fail',`HTTP ${r.status}`);
  else{
   const judge=(id:string,ev:any,valid:(x:any)=>boolean,required:boolean)=>{
    if(ev?.data&&valid(ev.data))return add(id,'provider-outage','pass',ev.stale?'stale cache':'live');
    if(ev?.data)return add(id,'schema-drift','fail','response data no longer matches the normalized contract');
    const kind=classifyProviderFailure(ev?.health?.message);add(id,kind,kind==='schema-drift'||required?'fail':'warn',`${ev?.health?.status||'missing'}: ${ev?.health?.message||'no data'}`);
   };
   judge('course:schedule-builder',c.course,isCourse,true);
   judge('sections:schedule-builder',c.sections,(x:any)=>Array.isArray(x)&&x.length>0&&x.every(isSection),true);
   judge('grades:gophergrades',c.grades,isGrades,false);
   add('community-context','optional-source',Array.isArray(c.community)?'pass':'warn',Array.isArray(c.community)?`${c.community.length} reviewed references`:'community field missing');
  }
 }catch(e){add('course-context','canonical','fail',String(e));}

 // Policy retrieval must stay review-only and still carry fresh official evidence.
 try{
  const r=await get('/api/policy/search',{method:'POST',headers:{'content-type':'application/json',origin:d.origin},body:JSON.stringify({text:'Students must complete at least 120 credits for the baccalaureate degree',campus:'UMNTC'})});
  const p:any=r.status===200?await r.json():null;
  add('policy-authority','security',p?.decisionAuthority==='none'?'pass':'fail',`decisionAuthority=${p?.decisionAuthority} (HTTP ${r.status})`);
  const official=Array.isArray(p?.evidence)?p.evidence.filter((x:any)=>x.sourceType==='official-umn'&&String(x.sourceRef||'').startsWith('https://policy.umn.edu/')).length:0;
  add('policy-live-evidence','policy-freshness',official>0?'pass':'fail',official>0?`${official} official snapshot passages served`:'no official policy evidence served (expired seed or retrieval regression)');
 }catch(e){add('policy-live-evidence','policy-freshness','fail',String(e));}

 const{expiresAt}=policySeedExpiry(d.seed);
 if(!expiresAt)add('policy-seed-expiry','policy-freshness','fail','seed has no dated policy snapshots');
 else{const left=(Date.parse(expiresAt)-now)/DAY;add('policy-seed-expiry','policy-freshness',left<2?'fail':left<4?'warn':'pass',`oldest snapshot expires ${expiresAt} (${left.toFixed(1)} days)`);}

 try{
  const r=await get('/api/health',{headers:{origin:'https://hostile.invalid'}});
  add('hostile-origin','security',r.status===403?'pass':'fail',`HTTP ${r.status}`);
 }catch(e){add('hostile-origin','security','fail',String(e));}

 try{
  const r=await get('/smart-umn-extension.zip');const live=new Uint8Array(await r.arrayBuffer());
  const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),a=sha(live),b=sha(d.releaseZip);
  add('extension-zip','package',r.status===200&&a===b?'pass':'fail',`live ${a.slice(0,16)}… / release ${b.slice(0,16)}…`);
 }catch(e){add('extension-zip','package','fail',String(e));}

 add('rate-limit','rate-limit',throttled?'fail':'pass',throttled?`${throttled} canary requests throttled with 429`:'no 429 for a low-volume client');
 return{checkedAt:new Date(now).toISOString(),origin:d.origin,ok:!checks.some(c=>c.status==='fail'),checks};
}
