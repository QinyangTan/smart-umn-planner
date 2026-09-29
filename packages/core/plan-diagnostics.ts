import type{Course,CourseContext,StudentAcademicProfile}from'../schemas/index.ts';
import{analyzeRequirementRouteCoverage,degreeFit,eligibility}from'./rules.ts';
import type{ProfileIssue}from'./profile-health.ts';

export type PlanStage='no-open-requirements'|'no-automatic-routes'|'no-current-offerings'|'no-verified-prerequisites'|'no-conflict-free-week'|'scheduled';
export type ReasonCount={reason:string;count:number};
export type PlanDiagnosis={
 stage:PlanStage;headline:string;actions:string[];
 routes:{open:number;automatic:number;reviewOnly:number};
 offerings:{coursesChecked:number;matching:number;loaded:number};
 prerequisites:{verified:number;needsReview:number;notMet:number;topReasons:ReasonCount[]};
 scheduling:{attempted:number;rejected:number;schedules:number;topReasons:ReasonCount[]};
};
export type PlanRunEvidence={catalogCourses:number;matchingCourses:number;contexts:CourseContext[];scheduled?:{schedules:number;rejected:{code:string;reason:string}[]}};

const top=(reasons:string[],n=3):ReasonCount[]=>{const m=new Map<string,number>();for(const r of reasons)m.set(r,(m.get(r)||0)+1);return[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,n).map(([reason,count])=>({reason,count}));};
// Group long, course-specific prerequisite explanations into stable buckets for counting.
function reasonBucket(reason:string):string{
 if(/\balready\b/i.test(reason))return'Already completed or in progress';
 if(/^Prerequisites not satisfied$/i.test(reason))return'Prerequisite course not completed';
 if(/campus/i.test(reason))return'Completed course has no recorded campus';
 if(/consent|permission|instructor|department/i.test(reason))return'Requires consent or department permission';
 if(/standing|admitted|major|program|college/i.test(reason))return'Requires standing, admission or a program restriction';
 if(/grade|minimum/i.test(reason))return'Requires a minimum grade that APAS does not prove';
 if(/concurrent|corequisite|co-requisite/i.test(reason))return'Unresolved corequisite';
 if(/missing|not completed|unmet|not satisfied|requires/i.test(reason))return'Prerequisite course not completed';
 return reason.length>90?reason.slice(0,87)+'…':reason;
}

export function diagnosePlan(profile:StudentAcademicProfile,run:PlanRunEvidence,issues:ProfileIssue[]=[],termName='this semester'):PlanDiagnosis{
 const cov=analyzeRequirementRouteCoverage(profile).overall;
 const routes={open:cov.totalActiveRemainingRequirements,automatic:cov.strictSupportedRequirements,reviewOnly:cov.totalActiveRemainingRequirements-cov.strictSupportedRequirements};
 const loaded=run.contexts.filter(c=>c.course.data);
 const verdicts=loaded.map(c=>({c,e:eligibility(c.course.data as Course,profile),fit:degreeFit(c.course.data as Course,profile).some(f=>f.result==='yes')}));
 const needsReview=verdicts.filter(v=>v.e.result==='unknown'),notMet=verdicts.filter(v=>v.e.result==='no');
 // A prerequisite that names a course the student recorded without a campus is blocked by that data gap, not by policy.
 const campusless=new Set([...profile.completedCourses,...profile.transferCourses].filter(c=>!c.campus&&c.courseCode).map(c=>c.courseCode as string));
 const refs=(r:any):string[]=>!r||typeof r!=='object'?[]:r.type==='course'?[r.code]:[...(r.rules||[]).flatMap(refs),...(r.rule?refs(r.rule):[])];
 const blockedByCampus=(c:Course)=>refs(c.prerequisiteRule).some(code=>campusless.has(code));
 const prerequisites={verified:verdicts.filter(v=>v.e.result==='yes'&&v.fit).length,needsReview:needsReview.length,notMet:notMet.length,topReasons:top([...needsReview,...notMet].map(v=>v.e.result==='unknown'&&blockedByCampus(v.c.course.data as Course)?'Completed course has no recorded campus':reasonBucket(v.e.reason)))};
 const s=run.scheduled,scheduling={attempted:prerequisites.verified,rejected:s?.rejected.length||0,schedules:s?.schedules||0,topReasons:top((s?.rejected||[]).map(r=>r.reason))};
 const offerings={coursesChecked:run.catalogCourses,matching:run.matchingCourses,loaded:loaded.length};
 const resync=issues.some(i=>i.kind==='missing-campus'||i.kind==='stale-parser');
 let stage:PlanStage,headline:string;const actions:string[]=[];
 if(routes.open===0){stage='no-open-requirements';headline='No remaining APAS requirement is open.';actions.push('Check the official APAS audit; if it is complete there is nothing left to plan.');}
 else if(routes.automatic===0){stage='no-automatic-routes';headline=`All ${routes.open} remaining requirements need policy or advisor judgment.`;actions.push('Open “See requirements” to review each item.','Ask an advisor about the review-only requirements.');}
 else if(offerings.matching===0){stage='no-current-offerings';headline=`No ${termName} offering matches your ${routes.automatic} automatically supported requirement${routes.automatic===1?'':'s'}.`;actions.push('Try another semester in the selector above.','Browse Explore for courses that need review.');}
 else if(prerequisites.verified===0){stage='no-verified-prerequisites';headline=`${offerings.loaded} matching course${offerings.loaded===1?' was':'s were'} found, but none has prerequisites Smart UMN can verify.`;if(resync)actions.push('Re-sync APAS: your stored profile is missing data needed to verify prerequisites.');actions.push('Review the candidate list below and confirm conditions with the department.');}
 else if(scheduling.schedules===0){stage='no-conflict-free-week';headline=`${prerequisites.verified} eligible course${prerequisites.verified===1?'':'s'} found, but no conflict-free week fits your preferences.`;actions.push('Open “Make it yours” and lower the minimum credits or allow more campus days.','Try another semester.');}
 else{stage='scheduled';headline=`${scheduling.schedules} schedule option${scheduling.schedules===1?'':'s'} built from ${prerequisites.verified} eligible course${prerequisites.verified===1?'':'s'}.`;}
 if(resync&&stage!=='no-verified-prerequisites'&&stage!=='scheduled')actions.unshift('Re-sync APAS first: your stored profile is outdated or incomplete.');
 return{stage,headline,actions,routes,offerings,prerequisites,scheduling};
}
