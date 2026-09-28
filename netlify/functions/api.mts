import type {Config,Context} from '@netlify/functions';
import pkg from '../../package.json' with {type:'json'};
import seed from '../../config/public-evidence-seed.json' with {type:'json'};
import {PARSER_VERSION} from '../../packages/apas-parser/index.ts';
import {Store} from '../../packages/providers/store.ts';
import {ContextService} from '../../packages/providers/index.ts';
import {campusCode,courseCode,record,subjectCode,termCode} from '../../packages/schemas/index.ts';
import {loadPolicyRegistry,policyDocumentsFromSnapshots} from '../../packages/retrieval/documents.ts';
import {HybridPolicyRetriever} from '../../packages/retrieval/lexical.ts';
import {RequestBudget,RequestError} from '../../apps/api/security.ts';

type Runtime={store:Store;context:ContextService;budget:RequestBudget;hosts:Set<string>;origins:Set<string>;policyClassifier:HybridPolicyRetriever;policyEvidence:HybridPolicyRetriever;startedAt:number;requests:number;rejected:number;errors:number};
let runtime:Runtime|undefined;
const WEB_ORIGINS=['https://smart-umn-planner.netlify.app','https://smartumn.qinyangtan.com'];
// Direct-download/Developer-mode ID (fixed by manifest `key`) and the Chrome Web Store item ID (Store assigns its own; `key` is not allowed there).
const EXTENSION_IDS=['cleikpoiflloemienikmmmedkniblobc','ocbpkaiefaaboeiliopklleejlfnegbd'];
function getRuntime():Runtime{
 if(runtime)return runtime;
 const store=new Store(':memory:');
 for(const row of seed.snapshots)store.put(row.key,row.source,row.payload,row.retrievedAt);
 for(const ref of seed.community)store.reference(ref as any);
 runtime={store,context:new ContextService(store),budget:new RequestBudget(),hosts:new Set(WEB_ORIGINS.map(x=>new URL(x).host)),origins:new Set([...WEB_ORIGINS,...EXTENSION_IDS.map(id=>`chrome-extension://${id}`)]),policyClassifier:new HybridPolicyRetriever(loadPolicyRegistry()),policyEvidence:new HybridPolicyRetriever(policyDocumentsFromSnapshots(store.policySnapshots())),startedAt:Date.now(),requests:0,rejected:0,errors:0};
 return runtime;
}
function json(status:number,data:unknown,headers:HeadersInit={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()',...headers}});}
function allowed(req:Request,r:Runtime){const u=new URL(req.url);if(u.protocol!=='https:'||!r.hosts.has(u.host))return false;const origin=req.headers.get('origin');if(origin&&!r.origins.has(origin))return false;if(req.headers.get('sec-fetch-site')==='cross-site'&&!origin)return false;return true;}
async function body(req:Request,limit=32768){if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))throw new RequestError(415,'JSON required');const n=Number(req.headers.get('content-length'));if(n>limit)throw new RequestError(413,'Request too large');const text=await req.text();if(Buffer.byteLength(text)>limit)throw new RequestError(413,'Request too large');try{return JSON.parse(text);}catch{throw new RequestError(400,'Invalid JSON');}}

export default async(req:Request,ctx:Context)=>{
 const r=getRuntime();r.requests++;const u=new URL(req.url);const cors=req.headers.get('origin');const corsHeaders:Record<string,string>={};if(cors&&r.origins.has(cors)){corsHeaders['Access-Control-Allow-Origin']=cors;corsHeaders['Vary']='Origin';corsHeaders['Access-Control-Allow-Headers']='Content-Type';corsHeaders['Access-Control-Allow-Methods']='GET,POST,OPTIONS';}
 try{
  if(!allowed(req,r)){r.rejected++;return json(403,{error:'Host or origin not allowed'});}
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
  if(u.pathname!=='/api/health'&&!r.budget.take('ip:'+((ctx as any).ip||'unknown'))){r.rejected++;return json(429,{error:'Public evidence service busy; retry shortly'},{...corsHeaders,'Retry-After':'60'});}
  const term=()=>termCode(u.searchParams.get('term')||'1273'),campus=()=>{const c=campusCode(u.searchParams.get('campus')||'UMNTC');if(c!=='UMNTC')throw Error('Smart UMN currently supports Twin Cities Schedule Builder only');return c;};
  if(req.method==='GET'&&u.pathname==='/api/health')return json(200,{status:'running',version:pkg.version,parserVersion:PARSER_VERSION,serverless:true,cache:'ephemeral-public',providers:r.store.healthList(),metrics:{requests:r.requests,rejected:r.rejected,errors:r.errors,uptimeMs:Date.now()-r.startedAt,providers:{scheduleBuilder:{...r.context.sb.stats},gopherGrades:{...r.context.gg.stats}}}},corsHeaders);
  if(req.method==='GET'&&u.pathname==='/api/health/providers')return json(200,{providers:await Promise.all([r.context.sb.healthCheck(),r.context.gg.healthCheck()])},corsHeaders);
  if(req.method==='GET'&&u.pathname==='/api/subjects')return json(200,await r.context.sb.fetchSubjects(campus()),corsHeaders);
  const catalog=/^\/api\/catalog\/([^/]+)$/.exec(u.pathname);if(req.method==='GET'&&catalog)return json(200,await r.context.sb.fetchSubjectCourses(subjectCode(decodeURIComponent(catalog[1])),term(),campus()),corsHeaders);
  const attribute=/^\/api\/attributes\/([^/]+)\/([^/]+)$/.exec(u.pathname);if(req.method==='GET'&&attribute)return json(200,await r.context.sb.fetchAttributeCourses(decodeURIComponent(attribute[1]),decodeURIComponent(attribute[2]),term(),campus()),corsHeaders);
  if(req.method==='GET'&&u.pathname==='/api/general-education')return json(200,await r.context.sb.fetchGeneralEducationCatalog(campus(),term()),corsHeaders);
  if(req.method==='GET'&&u.pathname.startsWith('/api/courses/')){const bits=u.pathname.split('/'),code=courseCode(decodeURIComponent(bits[3])),value=await r.context.get(code,term(),campus());return json(200,bits[4]==='sections'?value.sections:bits[4]==='context'?value:value.course,corsHeaders);}
  if(req.method==='POST'){
   if(!['/api/course-context/batch','/api/policy/search'].includes(u.pathname))return json(404,{error:'Private academic data is not accepted by this API'},corsHeaders);
   const input=record(await body(req));
   if(u.pathname==='/api/course-context/batch'){if(Object.keys(input).some(k=>!['codes','term','campus'].includes(k))||!Array.isArray(input.codes)||input.codes.length<1||input.codes.length>12||input.codes.some((x:unknown)=>typeof x!=='string'))return json(400,{error:'Batch accepts 1–12 public course codes, campus and term only'},corsHeaders);const t=termCode(String(input.term)),c=campusCode(String(input.campus||'UMNTC'));if(c!=='UMNTC')return json(400,{error:'Smart UMN currently supports Twin Cities Schedule Builder only'},corsHeaders);const codes=[...new Set(input.codes.map((x:string)=>courseCode(x)))];return json(200,await Promise.all(codes.map(code=>r.context.get(code,t,c))),corsHeaders);}
   if(Object.keys(input).some(k=>!['text','campus','college','program','catalogYear','limit'].includes(k)))return json(400,{error:'Policy search accepts only one rule text plus public program metadata'},corsHeaders);if(typeof input.text!=='string'||!input.text.trim()||input.text.length>2000)return json(400,{error:'Policy search requires 1–2000 characters of rule text'},corsHeaders);const c=campusCode(String(input.campus||'UMNTC'));if(c!=='UMNTC')return json(400,{error:'Policy retrieval currently supports Twin Cities only'},corsHeaders);const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max)||undefined:undefined,limit=Math.max(1,Math.min(5,Number(input.limit)||3)),query={text:input.text.trim(),campus:c,college:clean(input.college,160),program:clean(input.program,240),catalogYear:clean(input.catalogYear,80),limit};const classification=await r.policyClassifier.search({...query,limit:1}),evidence=await r.policyEvidence.search({...query,limit});return json(200,{mode:'bounded-lexical',classification:classification.matches[0]||null,evidence:evidence.matches,matches:[...(classification.matches[0]?[classification.matches[0]]:[]),...evidence.matches],queryFingerprint:classification.queryFingerprint,decisionAuthority:'none',note:'Semantic retrieval only. Classification and evidence do not authorize a course or satisfy a degree rule.'},corsHeaders);
  }
  if(req.method!=='GET')return json(405,{error:'Method not allowed'},corsHeaders);
  return json(404,{error:'Unknown endpoint'},corsHeaders);
 }catch(e){r.errors++;r.rejected++;return json(e instanceof RequestError?e.status:400,{error:e instanceof RequestError?e.message:'Invalid request or unavailable evidence'},corsHeaders);}
};
export const config:Config={path:'/api/*',rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']}};
