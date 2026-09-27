import type {CourseContext,InstructorRating,Section} from '../schemas/index.ts';
import {instructorEntityKey} from '../schemas/index.ts';

export function currentInstructorSignals(c:CourseContext){
 if(c.course.data?.campus!=='UMNTC')return[];
 const current=[...new Map((c.sections.data||[]).flatMap(s=>s.instructors).map(i=>[instructorEntityKey(i.name,'UMNTC'),i])).values()];
 return current.map(instructor=>{const key=instructorEntityKey(instructor.name,'UMNTC');const matches=(c.grades.data?.instructorRatings||[]).filter(r=>instructorEntityKey(r.instructorName,'UMNTC')===key);
  // Ambiguous identities or conflicting aggregates are not silently merged.
  const unique=new Map(matches.map(r=>[`${r.professorId}:${r.quality}`,r]));const rating=unique.size===1?[...unique.values()][0]:undefined;
  const reference=c.community.find(r=>r.source==='ratemyprofessor'&&r.entityType==='instructor'&&r.entityId===key&&/^https:\/\/www\.ratemyprofessors\.com\/professor\/\d+\/?$/.test(r.url));
  return{instructor,key,rating,originalUrl:reference?.url,searchUrl:`https://www.ratemyprofessors.com/search/professors/1257?q=${encodeURIComponent(instructor.name)}`,redditUrl:`https://www.reddit.com/r/uofmn/search/?q=${encodeURIComponent('"'+instructor.name+'"')}&restrict_sr=1&sort=new`,viaUrl:rating?`https://umn.lol/inst/${rating.professorId}`:undefined};
 });
}
export function redditCourseSearch(code:string){return`https://www.reddit.com/r/uofmn/search/?q=${encodeURIComponent('"'+code+'" OR "'+code.replace(/\s/g,'')+'"')}&restrict_sr=1&sort=new`;}
export function safeCommunityLink(value:string):string|undefined{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['www.reddit.com','reddit.com','www.ratemyprofessors.com','umn.lol'].includes(u.hostname)?u.href:undefined;}catch{return;}}
export function normalizeInstructorRatings(rows:unknown[]):InstructorRating[]{const out:InstructorRating[]=[];for(const raw of rows){if(!raw||typeof raw!=='object')continue;const r=raw as Record<string,unknown>;if(typeof r.professor_name!=='string'||!r.professor_name.trim()||typeof r.professor_id!=='number'||!Number.isSafeInteger(r.professor_id)||r.professor_id<=0||typeof r.professor_RMP_score!=='number'||!Number.isFinite(r.professor_RMP_score)||r.professor_RMP_score<1||r.professor_RMP_score>5)continue;out.push({instructorName:r.professor_name,professorId:r.professor_id,quality:r.professor_RMP_score,via:'gophergrades',source:'ratemyprofessors'});}return[...new Map(out.map(r=>[`${r.professorId}:${r.instructorName}:${r.quality}`,r])).values()];}
/** This is a student's explicit choice, never an inferred sentiment or quality score. */
export function preferredInstructorCount(sections:Section[],preferred:string[]=[]){const names=new Set(sections.flatMap(s=>s.instructors.map(i=>instructorEntityKey(i.name,s.campus||'UMNTC'))));return (Array.isArray(preferred)?preferred:[]).filter((key,i)=>typeof key==='string'&&preferred.indexOf(key)===i&&names.has(key)).length;}
