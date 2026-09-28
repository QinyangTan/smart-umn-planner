import type{StudentAcademicProfile,Preferences,Schedule}from'../schemas/index.ts';
import{courseCode,UMN_CAMPUSES}from'../schemas/index.ts';
export const STORAGE_VERSION=1;
export function readableStorage(version:string|null):boolean{return version===null||version==='0'||version===String(STORAGE_VERSION);}
export function storedJSON(raw:string|null,maximum=2_000_000):unknown{if(!raw||raw.length>maximum)return;try{return JSON.parse(raw);}catch{return;}}

const object=(v:any):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:any,max=2000)=>typeof v==='string'&&v.length<=max;
const number=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000;
const optional=(v:any,check:(v:any)=>boolean)=>v===undefined||check(v);
const array=(v:any,check:(v:any)=>boolean,max=2000):boolean=>Array.isArray(v)&&v.length<=max&&v.every(check);
const keys=(v:Record<string,any>,allowed:string)=>Object.keys(v).every(k=>allowed.split(' ').includes(k));
const campus=(v:any)=>optional(v,x=>typeof x==='string'&&Object.hasOwn(UMN_CAMPUSES,x));
const code=(v:any)=>typeof v==='string'&&courseCode(v)===v;
const stamp=(v:any)=>object(v)&&text(v.source,200)&&text(v.retrievedAt,80)&&optional(v.period,x=>text(x,200))&&optional(v.url,x=>text(x,2000));
const program=(v:any)=>object(v)&&keys(v,'name catalogYear expectedGraduation campus kind')&&text(v.name,300)&&campus(v.campus)&&optional(v.catalogYear,x=>text(x,100))&&optional(v.expectedGraduation,x=>text(x,100))&&optional(v.kind,x=>['degree','major','minor','certificate','what_if','unknown'].includes(x));
/** Shape validation cannot attest to a user's locally edited data. It prevents malformed data gaining authority or crashing the planner. */
export function academicProfile(value:unknown):StudentAcademicProfile|undefined{
 try{
  const json=JSON.stringify(value);if(!json||json.length>2_000_000)return;
  const p=JSON.parse(json);let nodes=0;
  const safeTree=(v:any,depth=0):boolean=>depth<=40&&++nodes<30000&&(Array.isArray(v)?v.every(x=>safeTree(x,depth+1)):object(v)?Object.keys(v).every(k=>!['__proto__','prototype','constructor'].includes(k)&&safeTree(v[k],depth+1)):v===null||['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v));
  if(!safeTree(p)||!object(p)||!keys(p,'schemaVersion program degreeCredits completedCourses inProgressCourses transferCourses requirements additionalPrograms syncedAt parserVersion warnings provenance')||p.schemaVersion!==undefined&&p.schemaVersion!==1)return;
  const rule=(r:any,d=0):boolean=>{
   if(d>24||!object(r)||!campus(r.campus))return false;
   switch(r.type){
    case'unknown':return text(r.sourceText,10000)&&text(r.reason,10000);
    case'policy':case'condition':return text(r.family,100)&&text(r.sourceText,10000)&&object(r.parameters);
    case'course':return code(r.code)&&optional(r.minimumGrade,x=>text(x,10));
    case'range':return text(r.subject,8)&&/^[A-Z]+$/.test(r.subject)&&Number.isInteger(r.min)&&Number.isInteger(r.max)&&r.min>=0&&r.max<=9999&&r.min<=r.max;
    case'attribute':return text(r.attribute,200)&&text(r.value,200);
    case'anyOf':case'allOf':return array(r.rules,x=>rule(x,d+1),2000);
    case'exclude':return rule(r.rule,d+1)&&array(r.excluded,x=>rule(x,d+1),2000);
    case'credits':case'count':case'gpa':return number(r.minimum)&&optional(r.maximum,x=>number(x)&&x>=r.minimum)&&rule(r.rule,d+1);
    default:return false;
   }
  };
  const requirement=(r:any,d=0):boolean=>d<=24&&object(r)&&text(r.id,300)&&text(r.label,10000)&&['complete','in_progress','incomplete','informational','unknown'].includes(r.status)&&array(r.coursesUsed,x=>text(x,100))&&array(r.children,x=>requirement(x,d+1))&&rule(r.rule)&&optional(r.candidateRule,x=>rule(x))&&object(r.rawMetadata)&&['requiredCredits','appliedCredits','inProgressCredits','remainingCredits','requiredCount','appliedCount','inProgressCount','remainingCount','requiredGpa'].every(k=>optional(r[k],number));
  const course=(c:any)=>object(c)&&keys(c,'courseCode campus subject number title credits term grade status transferSource')&&['completed','in_progress','transfer','future','unknown'].includes(c.status)&&optional(c.courseCode,code)&&campus(c.campus)&&optional(c.credits,number)&&['subject','number','title','term','grade','transferSource'].every(k=>optional(c[k],x=>text(x,1000)));
  const route=(r:any)=>object(r)&&program(r.program)&&array(r.requirements,x=>requirement(x))&&text(r.syncedAt,80)&&text(r.parserVersion,80)&&array(r.warnings,x=>text(x,10000))&&stamp(r.provenance);
  if(!route(p)||!object(p.degreeCredits)||!keys(p.degreeCredits,'required completed inProgress remaining')||!Object.values(p.degreeCredits).every(number)||!array(p.completedCourses,course)||!array(p.inProgressCourses,course)||!array(p.transferCourses,course)||!optional(p.additionalPrograms,x=>array(x,route,20)))return;
  return{...p,schemaVersion:1} as StudentAcademicProfile;
 }catch{return;}
}
export function preferences(value:unknown):Preferences{
 const p=object(value)?value:{};const min=number(p.minCredits)&&p.minCredits>=1&&p.minCredits<=30?p.minCredits:3,max=number(p.maxCredits)&&p.maxCredits>=min&&p.maxCredits<=30?p.maxCredits:Math.max(min,12);
 const out:Preferences={minCredits:min,maxCredits:max,planningGoal:['progress','lightLoad','gradeHistory'].includes(p.planningGoal)?p.planningGoal:'progress',fewestDays:p.fewestDays!==false};
 for(const k of ['noFriday','preferOnline','allowWaitlist'] as const)if(typeof p[k]==='boolean')out[k]=p[k];
 for(const k of ['earliestTime','latestTime'] as const)if(typeof p[k]==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p[k]))out[k]=p[k];
 if(number(p.minimumTransitionMinutes)&&p.minimumTransitionMinutes<=120)out.minimumTransitionMinutes=p.minimumTransitionMinutes;
 if(number(p.maxCampusDays)&&p.maxCampusDays>=1&&p.maxCampusDays<=7)out.maxCampusDays=p.maxCampusDays;
 if(Array.isArray(p.preferredInstructors))out.preferredInstructors=p.preferredInstructors.filter((x:any)=>text(x,200)).slice(0,100);
 return out;
}
export function savedPlans(value:unknown):{name:string;term:string;schedule:Schedule}[]{
 try{if(JSON.stringify(value)?.length>1_000_000)return[];}catch{return[];}
 if(!Array.isArray(value))return[];
 return value.slice(0,50).filter(p=>object(p)&&text(p.name,300)&&typeof p.term==='string'&&/^1\d{2}[359]$/.test(p.term)&&object(p.schedule)&&number(p.schedule.credits)&&number(p.schedule.campusDays)&&array(p.schedule.courses,c=>object(c)&&text(c.code,30)&&text(c.title,1000)&&array(c.attributes,x=>text(x,1000))&&array(c.equivalents,x=>text(x,100)))&&array(p.schedule.sections,s=>object(s)&&text(s.classNumber,50)&&text(s.courseCode,30)&&array(s.meetings,m=>object(m)&&array(m.days,x=>text(x,10)))&&array(s.instructors,i=>object(i)&&text(i.name,300)))&&array(p.schedule.explanations,x=>text(x,10000)));
}
