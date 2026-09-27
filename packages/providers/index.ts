import{normalizeInstructorRatings}from'../community/signals.ts';
import {campusCode,campusContext,courseCode,courseEntityKey,subjectCode,termCode,finite,record} from '../schemas/index.ts';
import type {Course,Section,Provenance,ProviderHealth,Evidence,GradeEvidence,Instructor,CourseContext,UMNCampus,GeneralEducationCatalog,GeneralEducationRequirement} from '../schemas/index.ts';
import {parsePrerequisites} from '../core/rules.ts';
import {Store} from './store.ts';
import {instructorEntityKey} from '../schemas/index.ts';
const iso=()=>new Date().toISOString();
const provenance=(source:string,url:string,period:string):Provenance=>({source,url,retrievedAt:iso(),period});
export function resolveInstructor(name:string,internetId?:string):Instructor{return{id:internetId?`umn:${internetId.toLowerCase()}`:`unresolved:${name.trim().toLowerCase()}`,name,internetId,aliases:[name]};}
export class CachedProvider {
 store:Store; source:string; fetcher:typeof fetch; ttl:number; pending=new Map<string,Promise<Evidence<any>>>(); lastRequest=0;
 constructor(source:string,store:Store,ttl:number,fetcher:typeof fetch=fetch){this.source=source;this.store=store;this.ttl=ttl;this.fetcher=fetcher;}
 async request<T>(key:string,url:string,period:string,normalize:(r:unknown)=>T,force=false):Promise<Evidence<T>>{
 const cached=this.store.get(key); const age=cached?Date.now()-Date.parse(cached.retrievedAt):Infinity;
 if(cached&&age<this.ttl&&!force)return{data:cached.data,stale:false,provenance:{...provenance(this.source,url,period),retrievedAt:cached.retrievedAt},health:{source:this.source,status:'healthy',checkedAt:cached.retrievedAt,message:'Validated cache'}};
 if(this.pending.has(key))return this.pending.get(key)!;
 const job=(async()=>{try{
 // Reserve one request slot per provider; no bursts when a batch arrives.
 const start=Math.max(Date.now(),this.lastRequest+350);this.lastRequest=start;await new Promise(r=>setTimeout(r,Math.max(0,start-Date.now())));
 const response=await this.fetcher(url,{signal:AbortSignal.timeout(12000),headers:{accept:'application/json'},redirect:'error'});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);const raw=await response.text();if(raw.length>8_000_000)throw new Error('Response too large');const data=normalize(JSON.parse(raw));const retrievedAt=iso();this.store.put(key,this.source,data,retrievedAt);const health:ProviderHealth={source:this.source,status:'healthy',checkedAt:retrievedAt};this.store.health(health);return{data,stale:false,provenance:{...provenance(this.source,url,period),retrievedAt},health};
 }catch(e){const health:ProviderHealth={source:this.source,status:cached?'degraded':'down',checkedAt:iso(),message:e instanceof Error?e.message:'Provider unavailable'};this.store.health(health);return{data:cached?.data||null,stale:!!cached,provenance:{...provenance(this.source,url,period),retrievedAt:cached?.retrievedAt||iso()},health};}})();this.pending.set(key,job);try{return await job;}finally{this.pending.delete(key);}
 }
}
function sbUrl(type:string,term:string,campus:UMNCampus,params:Record<string,string>){const c=campusContext(campus);return'https://schedulebuilder.umn.edu/api.php?'+new URLSearchParams({type,institution:c.institution,campus:c.campus,term:termCode(term),...params});}
function extractAssignedJSON(html:string,marker:string):unknown{const at=html.indexOf(marker);if(at<0)throw Error('Schedule Builder metadata marker missing');const start=html.indexOf('{',at+marker.length);if(start<0)throw Error('Schedule Builder metadata object missing');let depth=0,quoted=false,escape=false;for(let i=start;i<html.length;i++){const ch=html[i];if(quoted){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')quoted=false;continue;}if(ch==='"'){quoted=true;continue;}if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return JSON.parse(html.slice(start,i+1));}throw Error('Schedule Builder metadata object incomplete');}
export class ScheduleBuilderProvider extends CachedProvider {
 constructor(store:Store,fetcher=fetch){super('umn-schedule-builder',store,30_000,fetcher);}
 validateSchema(raw:unknown):boolean {try{this.normalize(raw);return true;}catch{return false;}}
 validate=this.validateSchema;
 normalize(raw:unknown,expectedCampus?:UMNCampus):Course {
  const r=record(raw);if(r.valid!==true||r.complete!==true||typeof r.campus!=='string'||typeof r.institution!=='string'||typeof r.subject!=='string'||typeof r.catalog_nbr!=='string'||typeof r.title!=='string'||!Array.isArray(r.sections)||r.sections.some((id:unknown)=>!/^\d+$/.test(String(id))))throw new Error('Course schema changed');
  const campus=campusCode(r.campus),cfg=campusContext(campus);if(r.institution!==cfg.institution||expectedCampus&&campus!==expectedCampus)throw new Error('Course campus/institution mismatch');
  const code=courseCode(r.subject+' '+r.catalog_nbr),term=termCode(String(r.term));const description=Array.isArray(r.description)?r.description.join('\n'):String(r.description||'');const prereq=typeof r.prerequisites==='string'?r.prerequisites:description.split('\n').find((s:string)=>/prereq:/i.test(s))||'';
  const min=finite(r.min_credits??r.credits),max=finite(r.max_credits??r.credits);const sourceUrl=sbUrl('course',term,campus,{subject:r.subject,catalog_nbr:r.catalog_nbr});
  return{institution:cfg.institution,campus,term,code,subject:code.split(' ')[0],catalogNumber:code.split(' ')[1],title:r.title,description,credits:min===max?min:min!==undefined&&max!==undefined?[min,max]:undefined,prerequisites:prereq,prerequisiteRule:parsePrerequisites(prereq,campus),attributes:(r.attributes||[]).map((a:unknown)=>typeof a==='string'?a:JSON.stringify(a)),sectionIds:r.sections.map(String),equivalents:(r.equivalents||[]).map(String),sourceRefs:{scheduleBuilder:sourceUrl},provenance:provenance(this.source,sourceUrl,term)};
 }
 fetchCourse(code:string,term:string,campus:UMNCampus='UMNTC'){const c=campusCode(campus),pair=courseCode(code).split(' '),subject=pair[0],catalog_nbr=pair[1],u=sbUrl('course',term,c,{subject,catalog_nbr});return this.request('course:'+c+':'+term+':'+subject+catalog_nbr,u,term,r=>this.normalize(r,c));}
 private async coursesFromIds(ids:string[],term:string,campus:UMNCampus,prefix:string,listUrl:string):Promise<Evidence<Course[]>>{
  if(!ids.length)return{data:[],stale:false,provenance:provenance(this.source,listUrl,term),health:{source:this.source,status:'healthy',checkedAt:iso()}};
  const chunks:string[][]=[];for(let i=0;i<ids.length;i+=100)chunks.push(ids.slice(i,i+100));const evidence:Evidence<Course[]>[]=[];
  for(const chunk of chunks){const bulk=sbUrl('courses',term,campus,{crse_ids:chunk.join(',')});evidence.push(await this.request<Course[]>(prefix+':courses:'+chunk.join(','),bulk,term,raw=>{if(!Array.isArray(raw))throw new Error('Bulk courses schema changed');const courses=raw.map(v=>this.normalize(v,campus));if(courses.some(c=>c.term!==term||c.campus!==campus))throw new Error('Bulk course campus/term mismatch');return courses;}));}
  if(evidence.some(e=>!e.data)){const failed=evidence.find(e=>!e.data)!;return{data:null,stale:true,provenance:provenance(this.source,listUrl,term),health:{source:this.source,status:'degraded',checkedAt:failed.health.checkedAt,message:failed.health.message||'Course catalog incomplete'}};}
  const stale=evidence.some(e=>e.stale),checkedAt=evidence.map(e=>e.health.checkedAt).sort().at(-1)||iso();return{data:evidence.flatMap(e=>e.data||[]),stale,provenance:{...provenance(this.source,listUrl,term),retrievedAt:checkedAt},health:{source:this.source,status:stale?'degraded':'healthy',checkedAt,message:stale?'Using cached catalog evidence':undefined}};
 }
 async fetchSubjectCourses(subject:string,term:string,campus:UMNCampus='UMNTC'):Promise<Evidence<Course[]>>{
  const c=campusCode(campus),s=subjectCode(subject),t=termCode(term),listUrl=sbUrl('courses_wildcard',t,c,{subject:s,catalog_nbr:''}),prefix='subject:'+c+':'+t+':'+s;
  const ids=await this.request<string[]>(prefix+':ids',listUrl,t,raw=>{if(!Array.isArray(raw)||raw.length>1000||raw.some(id=>!/^\d+$/.test(String(id))))throw new Error('Subject course-list schema changed');return[...new Set(raw.map(String))];});
  if(!ids.data)return{data:null,stale:ids.stale,provenance:ids.provenance,health:ids.health};const result=await this.coursesFromIds(ids.data,t,c,prefix,listUrl);
  return ids.stale&&result.data?{...result,stale:true,health:{...result.health,status:'degraded',message:'Using cached subject index'}}:result;
 }
 async fetchAttributeCourses(attribute:string,value:string,term:string,campus:UMNCampus='UMNTC'):Promise<Evidence<Course[]>>{
  const c=campusCode(campus),t=termCode(term),a=attribute.trim().toUpperCase(),v=value.trim().toUpperCase();if(!/^[A-Z0-9 _\/&+.-]{1,32}$/.test(a)||!/^[A-Z0-9 _\/&+.-]{1,64}$/.test(v))throw Error('Invalid Schedule Builder requirement attribute');
  const listUrl=sbUrl('courses_crse_attr',t,c,{crse_attrs:a,crse_attr_value:v}),prefix='attribute:'+c+':'+t+':'+a+':'+v;
  const ids=await this.request<string[]>(prefix+':ids',listUrl,t,raw=>{if(!Array.isArray(raw)||raw.length>3000||raw.some(id=>!/^\d+$/.test(String(id))))throw new Error('Attribute course-list schema changed');return[...new Set(raw.map(String))];});
  if(!ids.data)return{data:null,stale:ids.stale,provenance:ids.provenance,health:ids.health};const result=await this.coursesFromIds(ids.data,t,c,prefix,listUrl);
  return ids.stale&&result.data?{...result,stale:true,health:{...result.health,status:'degraded',message:'Using cached requirement index'}}:result;
 }
 async fetchSubjects(campus:UMNCampus='UMNTC'):Promise<Evidence<{code:string;name:string}[]>>{
  const c=campusCode(campus),key='subjects:'+c,cached=this.store.get(key),url='https://schedulebuilder.umn.edu/',period='Subject directory';
  const wrap=(data:any,stale:boolean,retrievedAt:string,message?:string):Evidence<{code:string;name:string}[]>=>({data,stale,provenance:{source:this.source,url,period,retrievedAt},health:{source:this.source,status:stale?'degraded':data?'healthy':'down',checkedAt:iso(),message}});
  if(cached&&Date.now()-Date.parse(cached.retrievedAt)<21600000)return wrap(cached.data,false,cached.retrievedAt);
  try{const response=await this.fetcher(url,{signal:AbortSignal.timeout(12000),headers:{accept:'text/html'},redirect:'error'});if(!response.ok)throw Error('HTTP '+response.status);const html=await response.text();if(html.length>4_000_000)throw Error('Subject directory too large');
   const raw=record(record(extractAssignedJSON(html,'SB2.Application.subjects'))[c]);const data=Object.entries(raw).map(([code,name])=>{subjectCode(code);if(typeof name!=='string'||!name.trim())throw Error('Subject directory schema changed');return{code,name};}).sort((a,b)=>a.name.localeCompare(b.name));if(!data.length)throw Error('Subject directory empty');const at=iso();this.store.put(key,this.source,data,at);return wrap(data,false,at);
  }catch(error){return wrap(cached?.data||null,!!cached,cached?.retrievedAt||iso(),String(error));}
 }
 async fetchGeneralEducationCatalog(campus:UMNCampus='UMNTC',term='1273'):Promise<Evidence<GeneralEducationCatalog>>{
  const c=campusCode(campus),cfg=campusContext(c),t=termCode(term),key='gened:'+c+':'+t,cached=this.store.get(key),ttl=21600000,age=cached?Date.now()-Date.parse(cached.retrievedAt):Infinity,sourceUrl='https://schedulebuilder.umn.edu/';
  if(cached&&age<ttl)return{data:cached.data,stale:false,provenance:{...provenance(this.source,sourceUrl,t),retrievedAt:cached.retrievedAt},health:{source:this.source,status:'healthy',checkedAt:cached.retrievedAt,message:'Validated general-education catalog cache'}};
  try{
   const response=await this.fetcher(sourceUrl,{signal:AbortSignal.timeout(12000),headers:{accept:'text/html'},redirect:'error'});if(!response.ok)throw Error('HTTP '+response.status);const html=await response.text();if(html.length>4_000_000)throw Error('Schedule Builder metadata response too large');
   const all=record(extractAssignedJSON(html,'SB2.Application.requirements')),byCampus=record(all[c]),raw=record(byCampus[t]),attrs=raw.attrs;if(!Array.isArray(attrs)||!attrs.length||attrs.some((x:unknown)=>typeof x!=='string'))throw Error('General-education attribute schema changed');
   const requirements=record(raw.requirements),tokens=record(raw.tokens),attribute=String(attrs[0]).trim(),rows:GeneralEducationRequirement[]=Object.entries(requirements).map(([value,name])=>{if(typeof name!=='string'||typeof tokens[value]!=='string')throw Error('General-education requirement schema changed');return{attribute,value,token:String(tokens[value]),name};});if(!rows.length||typeof raw.name!=='string')throw Error('General-education catalog empty');
   const retrievedAt=iso(),data:GeneralEducationCatalog={campus:c,institution:cfg.institution,term:t,name:raw.name,requirements:rows,provenance:{source:this.source,url:sourceUrl,retrievedAt,period:t}};this.store.put(key,this.source,data,retrievedAt);return{data,stale:false,provenance:data.provenance,health:{source:this.source,status:'healthy',checkedAt:retrievedAt}};
  }catch(e){const checkedAt=iso(),message=e instanceof Error?e.message:'General-education catalog unavailable';return{data:cached?.data||null,stale:!!cached,provenance:{...provenance(this.source,sourceUrl,t),retrievedAt:cached?.retrievedAt||checkedAt},health:{source:this.source,status:cached?'degraded':'down',checkedAt,message}};}
 }
 fetch(code:string,term:string,campus='UMNTC'){return this.fetchCourse(code,term,campusCode(campus));}
 normalizeSections(raw:unknown,term:string,expectedCampus:UMNCampus):Section[]{if(!Array.isArray(raw))throw new Error('Sections schema changed');return raw.map(value=>{
  const r=record(value);if(r.valid!==true||r.complete!==true||!/^\d+$/.test(String(r.id))||typeof r.section_number!=='string'||!Array.isArray(r.meetings)||typeof r.open!=='boolean'||!Array.isArray(r.links)||!Array.isArray(r.auto_enroll_sections)||!Array.isArray(r.reservations)||!Array.isArray(r.requirements))throw new Error('Section schema changed');
  if(String(r.term)!==term)throw new Error('Section term mismatch');const campus=campusCode(String(r.campus)),cfg=campusContext(campus);if(campus!==expectedCampus||String(r.institution)!==cfg.institution)throw Error('Section campus/institution mismatch');
  const code=courseCode(r.subject+' '+r.catalog_nbr);const teachers:Instructor[]=[];
  const meetings=r.meetings.map((m:any)=>{if(!m||typeof m!=='object')throw new Error('Meeting schema changed');for(const i of m.instructors||[]){if(typeof i.label_name!=='string')throw new Error('Instructor schema changed');teachers.push(resolveInstructor(i.label_name,i.internet_id));}
  const days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].filter(day=>m[day]===true).map(day=>day.slice(0,3));
  const time=(n:unknown)=>typeof n==='number'&&n>=0&&n<86400?String(Math.floor(n/3600)).padStart(2,'0')+':'+String(Math.floor(n%3600/60)).padStart(2,'0'):undefined;
  const date=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?new Date(n).toISOString().slice(0,10):undefined;
  return{days,startTime:time(m.start_time),endTime:time(m.end_time),startDate:date(m.start_date),endDate:date(m.end_date),location:m.room?.description};});
  const auto=r.auto_enroll_sections,linked=auto.filter((id:unknown)=>typeof id==='number'||typeof id==='string').map(String),restrictions=[...r.reservations,...(r.consent?[{consent:r.consent}]:[]),...(r.reserved?[{reserved:true}]:[])],known=meetings.length>0&&meetings.every((m:any)=>m.days.length&&m.startTime&&m.endTime&&m.startDate&&m.endDate),instructionMode=String(r.instruction_mode||'Unknown');
  return{classNumber:String(r.id),sectionNumber:r.section_number,courseCode:code,institution:cfg.institution,campus,term,component:String(r.component_short||r.component),credits:finite(r.credits),instructors:[...new Map(teachers.map(i=>[i.id,i])).values()],meetings,capacity:finite(r.capacity),enrolled:finite(r.enrolled_total),waitlistCapacity:finite(r.waitlist_capacity),waitlistTotal:finite(r.waitlist_total),open:r.open===true&&!r.canceled,enrollable:r.enrollable===true,instructionMode,restrictions,prerequisiteRule:parsePrerequisites(r.requirements.length?r.requirements.map((x:any)=>x.description).join(' AND '):'No prerequisites',campus),linkedClassNumbers:linked,unresolvedLinks:r.links.length>0||auto.length!==linked.length,scheduleKnown:known,provenance:provenance(this.source,sbUrl('sections',term,campus,{class_nbrs:String(r.id)}),term)};
 });}
 fetchSections(ids:string[],term:string,campus:UMNCampus='UMNTC'):Promise<Evidence<Section[]>>{const c=campusCode(campus),t=termCode(term);if(!ids.length)return Promise.resolve({data:[],stale:false,provenance:provenance(this.source,'https://schedulebuilder.umn.edu',t),health:{source:this.source,status:'healthy',checkedAt:iso()}});if(ids.length>100||ids.some(i=>!/^\d+$/.test(i)))throw new Error('Invalid class numbers');return this.request('sections:'+c+':'+t+':'+[...ids].sort().join(','),sbUrl('sections',t,c,{class_nbrs:ids.join(',')}),t,r=>this.normalizeSections(r,t,c));}
 async healthCheck(){return(await this.fetchCourse('CSCI 4041','1269','UMNTC')).health;}
}
export class GopherGradesProvider extends CachedProvider {
 constructor(store:Store,fetcher=fetch){super('gophergrades',store,86400000,fetcher);}
 validate(raw:unknown){try{this.normalize(raw);return true;}catch{return false;}}
 normalize(raw:unknown):GradeEvidence{const outer=record(raw),r=record(outer.data);if(outer.success!==true||typeof r.total_students!=='number'||!Array.isArray(r.distributions))throw new Error('GopherGrades schema changed');const counts=(v:unknown)=>{const c=record(v);if(Object.values(c).some(n=>typeof n!=='number'||n<0||!Number.isInteger(n)))throw new Error('Grade counts invalid');return c as Record<string,number>;};return{instructorRatings:normalizeInstructorRatings(r.distributions),courseCode:courseCode(r.dept_abbr+' '+r.course_num),totalStudents:r.total_students,grades:counts(r.total_grades),distributions:r.distributions.flatMap((d:any)=>(Array.isArray(d.terms)?d.terms:[d]).map((t:any)=>{if(!Number.isInteger(t.students)||t.students<0||!/^1\d{2}[359]$/.test(String(t.term)))throw new Error('Historical term schema changed');return{instructorName:typeof d.professor_name==='string'?d.professor_name:undefined,term:String(t.term),students:t.students,grades:counts(t.grades)};}))};}
 async fetch(code:string){const c=courseCode(code);const result=await this.request(`grades:v2:${c}`,'https://umn.lol/api/class/'+c.replace(' ',''),'Historical reported terms',r=>this.normalize(r));if(result.data){const terms=result.data.distributions.map(d=>d.term).sort();result.provenance.sampleSize=result.data.totalStudents;result.provenance.period=`${terms[0]}–${terms.at(-1)}`;}return result;}
 async healthCheck(){return(await this.fetch('CSCI 4041')).health;}
}
export class UMNSRTProvider {
 validate(raw:unknown){return false;}
 normalize(raw:unknown){throw new Error('Official SRT access not configured');}
 async healthCheck():Promise<ProviderHealth>{return{source:'umn-srt',status:'down',checkedAt:iso(),message:'No verified official course-feedback connector. Third-party SRT-like fields are not relabeled as official.'};}
 async fetch():Promise<Evidence<unknown>>{return{data:null,stale:false,provenance:{source:'umn-srt',retrievedAt:iso(),period:'Unavailable'},health:await this.healthCheck()};}
}
function unavailableGrades(campus:UMNCampus):Evidence<GradeEvidence>{const checkedAt=iso();return{data:null,stale:false,provenance:{source:'gophergrades',retrievedAt:checkedAt,period:'Unavailable for '+campusContext(campus).name},health:{source:'gophergrades',status:'degraded',checkedAt,message:'Historical GopherGrades coverage is not verified for this campus; no Twin Cities grade data is substituted.'}};}
export class ContextService {
 sb:ScheduleBuilderProvider; gg:GopherGradesProvider; srt=new UMNSRTProvider(); store:Store;
 constructor(store:Store){this.store=store;this.sb=new ScheduleBuilderProvider(store);this.gg=new GopherGradesProvider(store);}
 async get(code:string,term:string,campus:UMNCampus='UMNTC'):Promise<CourseContext>{const c=campusCode(campus),[course,grades,feedback]=await Promise.all([this.sb.fetchCourse(code,term,c),c==='UMNTC'?this.gg.fetch(code):Promise.resolve(unavailableGrades(c)),this.srt.fetch()]);const sections=await this.sb.fetchSections(course.data?.sectionIds||[],term,c);if(!course.data)sections.health=course.health;const refs=[...this.store.references(courseEntityKey(code,c))];for(const instructor of [...new Map((sections.data||[]).flatMap(s=>s.instructors).map(i=>[i.id,i])).values()]){try{refs.push(...this.store.references(instructorEntityKey(instructor.name,c)));}catch{}}const community=[...new Map(refs.map(r=>[r.url,r])).values()];return{course,sections,grades,feedback,community};}
}
