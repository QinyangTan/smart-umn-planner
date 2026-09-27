import{readFileSync}from'node:fs';
import{JSDOM}from'jsdom';
import{Store}from'../packages/providers/store.ts';
import{ScheduleBuilderProvider,GopherGradesProvider}from'../packages/providers/index.ts';
import{parseAPAS}from'../packages/apas-parser/index.ts';
import{enrichGeneralEducation}from'../packages/core/general-education.ts';
import{flattenRequirements}from'../packages/core/rules.ts';

const term='1273';
const subjects=['CSCI','PSY','BIOL','ACCT','GDES','JOUR','NURS','FSCN','EPSY','PUBH'];
const store=new Store(':memory:'),sb=new ScheduleBuilderProvider(store),gg=new GopherGradesProvider(store);
try{
 const directory=await sb.fetchSubjects('UMNTC');if(!directory.data||directory.stale)throw Error('Twin Cities subject directory verification failed: '+(directory.health.message||'missing/stale directory'));for(const code of subjects)if(!directory.data.some(s=>s.code===code))throw Error('Twin Cities subject directory missing expected '+code);
 const catalogs=[] as {subject:string;count:number;health:string}[];
 for(const subject of subjects){
  const evidence=await sb.fetchSubjectCourses(subject,term,'UMNTC');
  if(!evidence.data||evidence.stale)throw Error(subject+' Twin Cities catalog verification failed: '+(evidence.health.message||'missing/stale catalog'));
  catalogs.push({subject,count:evidence.data.length,health:evidence.health.status});
 }
 const gened=await sb.fetchGeneralEducationCatalog('UMNTC',term);
 if(!gened.data||gened.stale)throw Error('Twin Cities liberal-education catalog verification failed: '+(gened.health.message||'missing/stale catalog'));
 const grades=await gg.fetch('PSY 1001');
 if(!grades.data)throw Error('GopherGrades Twin Cities verification failed: '+(grades.health.message||'missing data'));
 const result:any={checkedAt:new Date().toISOString(),scope:'UMN Twin Cities',term,scheduleBuilder:{subjectDirectory:{count:directory.data.length,health:directory.health.status,samples:subjects},catalogs,liberalEducation:{name:gened.data.name,count:gened.data.requirements.length}},gopherGrades:{scope:'Current public product queries are Twin Cities-only',course:'PSY 1001',health:grades.health.status,totalStudents:grades.data.totalStudents,period:grades.provenance.period}};
 const[auditPath]=process.argv.slice(2);
 if(auditPath){
  const auditDom=new JSDOM(readFileSync(auditPath,'utf8'));let profile=parseAPAS(auditDom.window.document);profile=enrichGeneralEducation(profile,gened.data);
  const open=flattenRequirements(profile.requirements).filter(r=>r.status==='incomplete'||r.status==='in_progress'),strict=open.filter(r=>r.rule.type!=='unknown'),candidate=open.filter(r=>r.rule.type==='unknown'&&r.candidateRule);
  result.localAPAS={parsed:true,parserVersion:profile.parserVersion,openRequirements:open.length,strictCourseRoutes:strict.length,candidateOnlyRoutes:candidate.length,routeLabels:[...strict,...candidate].map(r=>r.label),warnings:profile.warnings};
  auditDom.window.close();
 }
 console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}finally{store.close();}
