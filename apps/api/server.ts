import {createServer} from 'node:http';import{readFile}from'node:fs/promises';import{resolve,extname}from'node:path';import{fileURLToPath}from'node:url';
import{Store}from'../../packages/providers/store.ts';import{ContextService}from'../../packages/providers/index.ts';import{campusCode,courseCode,subjectCode,termCode,record}from'../../packages/schemas/index.ts';
const ROOT=resolve(fileURLToPath(new URL('../..',import.meta.url)));const store=new Store(process.env.PLANNER_DB||resolve(ROOT,'var/planner.sqlite'));const context=new ContextService(store);const port=Number(process.env.PORT||4317);const origin=`http://127.0.0.1:${port}`;
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
export const server=createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
 const send=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
 if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`)return send(403,{error:'Invalid host'});
 const from=req.headers.origin;if(from&&from!==origin&&from!==`http://localhost:${port}`&&!/^chrome-extension:\/\/[a-p]{32}$/.test(from))return send(403,{error:'Origin not allowed'});
 if(from)res.setHeader('Access-Control-Allow-Origin',from);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 const u=new URL(req.url||'/',origin);const term=()=>termCode(u.searchParams.get('term')||'1273'),campus=()=>{const c=campusCode(u.searchParams.get('campus')||'UMNTC');if(c!=='UMNTC')throw Error('Smart UMN currently supports Twin Cities Schedule Builder only');return c;};
 if(req.method==='GET'&&u.pathname==='/api/health')return send(200,{status:'running',localOnly:true,providers:store.healthList()});
 if(req.method==='GET'&&u.pathname==='/api/subjects')return send(200,await context.sb.fetchSubjects(campus()));
 const catalog=/^\/api\/catalog\/([^/]+)$/.exec(u.pathname);if(req.method==='GET'&&catalog){const subject=subjectCode(decodeURIComponent(catalog[1]));return send(200,await context.sb.fetchSubjectCourses(subject,term(),campus()));}
 const attribute=/^\/api\/attributes\/([^/]+)\/([^/]+)$/.exec(u.pathname);if(req.method==='GET'&&attribute){return send(200,await context.sb.fetchAttributeCourses(decodeURIComponent(attribute[1]),decodeURIComponent(attribute[2]),term(),campus()));}
 if(req.method==='GET'&&u.pathname==='/api/general-education')return send(200,await context.sb.fetchGeneralEducationCatalog(campus(),term()));
 if(req.method==='GET'&&u.pathname.startsWith('/api/courses/')){const bits=u.pathname.split('/');const code=courseCode(decodeURIComponent(bits[3]));const value=await context.get(code,term(),campus());return send(200,bits[4]==='sections'?value.sections:bits[4]==='context'?value:value.course);}
 if(req.method==='POST'){
 if(!/^application\/json\b/.test(req.headers['content-type']||''))return send(415,{error:'JSON required'});let body='';for await(const chunk of req){body+=chunk;if(body.length>32768)return send(413,{error:'Request too large'});}const input=record(JSON.parse(body));
 if(u.pathname==='/api/course-context/batch'){if(Object.keys(input).some(k=>!['codes','term','campus'].includes(k))||!Array.isArray(input.codes)||input.codes.length>12||input.codes.some((c:unknown)=>typeof c!=='string'))return send(400,{error:'Batch accepts 1–12 public course codes, campus and term only'});const t=termCode(String(input.term)),c=campusCode(String(input.campus||'UMNTC'));if(c!=='UMNTC')return send(400,{error:'Smart UMN currently supports Twin Cities Schedule Builder only'});const codes=[...new Set(input.codes.map((x:string)=>courseCode(x)))];return send(200,await Promise.all(codes.map(code=>context.get(code,t,c))));}
 if(['/api/student/context','/api/student/plans','/api/recommendations','/api/schedules/generate'].includes(u.pathname))return send(409,{error:'Local-first mode: student context, plans and deterministic planning run in the browser. Private data is not accepted by this API.'});
 return send(404,{error:'Unknown endpoint'});
 }
 if(req.method!=='GET')return send(405,{error:'Method not allowed'});
 if(u.pathname.startsWith('/api/'))return send(404,{error:'Unknown endpoint'});
 const path=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).slice(1);const target=resolve(ROOT,'dist/web',path);if(!target.startsWith(resolve(ROOT,'dist/web')+'/'))return send(403,{error:'Invalid path'});
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 const data=await readFile(target);res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream'});res.end(data);
 }catch(e){if((e as any)?.code==='ENOENT')return send(404,{error:'Not found'});send(400,{error:e instanceof Error?e.message:'Invalid request'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Smart UMN Planner: ${origin}`));
for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
