import fs from'node:fs';import path from'node:path';
import{ScheduleBuilderProvider}from'../packages/providers/index.ts';import{Store}from'../packages/providers/store.ts';
import{publicCourseCoverageMarkdown,subjectCoverage,summarizePublicCourseCoverage}from'../packages/core/course-coverage.ts';
import{courseCode,subjectCode,termCode}from'../packages/schemas/index.ts';

const term=termCode(process.argv[2]||'1273'),jsonPath=path.resolve(process.argv[3]||'docs/evidence/course-intelligence-coverage.json'),mdPath=path.resolve(process.argv[4]||'docs/COURSE_INTELLIGENCE_COVERAGE.md');
const store=new Store('var/course-coverage.sqlite'),communityStore=new Store('var/planner.sqlite'),sb=new ScheduleBuilderProvider(store);
type GradeDept={status:'available'|'missing'|'error';codes:Set<string>};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function gradeDepartment(subject:string):Promise<GradeDept>{
 try{
  const response=await fetch('https://umn.lol/api/dept/'+encodeURIComponent(subject),{signal:AbortSignal.timeout(15000),headers:{accept:'application/json'},redirect:'error'});
  if(response.status===404)return{status:'missing',codes:new Set()};if(!response.ok)return{status:'error',codes:new Set()};
  const raw=await response.text();if(raw.length>8_000_000)return{status:'error',codes:new Set()};const outer=JSON.parse(raw),data=outer?.data;if(outer?.success===false)return{status:'missing',codes:new Set()};
  if(outer?.success!==true||!data||data.campus!=='UMNTC'||data.dept_abbr!==subject||!Array.isArray(data.distributions))return{status:'error',codes:new Set()};
  const codes=new Set<string>();for(const d of data.distributions){if(!d||d.campus!=='UMNTC'||d.dept_abbr!==subject||typeof d.course_num!=='string'||typeof d.total_students!=='number'||d.total_students<0)continue;try{if(d.total_students>0)codes.add(courseCode(subject+' '+d.course_num));}catch{}}
  return{status:'available',codes};
 }catch{return{status:'error',codes:new Set()};}
}
async function mapLimit<T,R>(items:T[],limit:number,fn:(item:T,index:number)=>Promise<R>):Promise<R[]>{const out=new Array<R>(items.length);let next=0;async function worker(){while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i);}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;}

try{
 const subjectEvidence=await sb.fetchSubjects('UMNTC');if(!subjectEvidence.data||subjectEvidence.stale)throw new Error('Current Twin Cities subject directory unavailable or stale');
 const subjects=subjectEvidence.data.map(x=>subjectCode(x.code)).sort(),started=Date.now(),currentCodes=new Set<string>();let completed=0;
 const rows=await mapLimit(subjects,6,async(subject)=>{
  const [catalog,grades]=await Promise.all([sb.fetchSubjectCourses(subject,term,'UMNTC'),gradeDepartment(subject)]);for(const c of catalog.data||[])currentCodes.add(c.code);completed++;
  if(completed%25===0||completed===subjects.length)console.error(`coverage ${completed}/${subjects.length} · ${subject} · ${Math.round((Date.now()-started)/1000)}s`);
  return subjectCoverage({subject,courses:catalog.data||[],scheduleBuilderStatus:catalog.data?(catalog.stale?'degraded':'healthy'):'down',historicalCourseCodes:grades.codes,gopherGradesStatus:grades.status});
 });
 let courseReferences=0,coursesWithReferences=0;for(const code of currentCodes){const refs=communityStore.references(code).filter(r=>r.entityType==='course');if(refs.length){coursesWithReferences++;courseReferences+=refs.length;}}
 const summary=summarizePublicCourseCoverage(rows,new Date().toISOString(),term,{courseReferences,coursesWithReferences});
 fs.mkdirSync(path.dirname(jsonPath),{recursive:true});fs.mkdirSync(path.dirname(mdPath),{recursive:true});fs.writeFileSync(jsonPath,JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(mdPath,publicCourseCoverageMarkdown(summary));
 console.log(JSON.stringify({jsonPath,mdPath,term,subjects:summary.subjects,currentCourses:summary.currentCourses,historical:summary.historical,community:summary.community},null,2));
}finally{store.close();communityStore.close();}
