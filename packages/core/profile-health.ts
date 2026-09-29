import type{StudentAcademicProfile,StudentCourse}from'../schemas/index.ts';
import{analyzeRequirementRouteCoverage}from'./rules.ts';

export type ProfileIssue={kind:'stale-parser'|'missing-campus'|'no-automatic-routes';severity:'action'|'info';title:string;detail:string};

// Explains, before planning, why a stored profile may produce few or no automatic schedules.
// It never repairs data: a missing campus is not inferred and an old parse is not upgraded in place.
export function profileHealth(profile:StudentAcademicProfile|undefined,currentParser:string):ProfileIssue[]{
 if(!profile)return[];
 const issues:ProfileIssue[]=[];
 const programs=[profile,...(profile.additionalPrograms||[])];
 const versions=[...new Set(programs.map(p=>p.parserVersion))];
 const stale=versions.filter(v=>v!==currentParser);
 if(stale.length)issues.push({kind:'stale-parser',severity:'action',title:'Your APAS was read by an older Smart UMN version',detail:`Stored with parser ${stale.join(', ')}; this site uses ${currentParser}. Newer parsers recognize more requirements. Re-sync APAS to plan with the current rules.`});
 const courses:StudentCourse[]=[...profile.completedCourses,...profile.inProgressCourses,...profile.transferCourses];
 const missing=courses.filter(c=>!c.campus).length;
 if(missing)issues.push({kind:'missing-campus',severity:'action',title:`${missing} of ${courses.length} recorded course${courses.length===1?'':'s'} have no campus`,detail:'Smart UMN never guesses a campus, so prerequisites that depend on these courses stay “needs review” and those courses cannot be scheduled automatically. Re-sync APAS so each course carries its UMN campus.'});
 const coverage=analyzeRequirementRouteCoverage(profile).overall;
 if(coverage.totalActiveRemainingRequirements>0&&coverage.strictSupportedRequirements===0)issues.push({kind:'no-automatic-routes',severity:'info',title:'No remaining requirement can authorize courses automatically',detail:`All ${coverage.totalActiveRemainingRequirements} remaining requirement${coverage.totalActiveRemainingRequirements===1?'':'s'} need policy or advisor judgment, so Build my plan can suggest candidates but cannot place them into a schedule.`});
 return issues;
}
