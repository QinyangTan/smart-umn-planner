import{preferredInstructorCount}from'../community/signals.ts';
import type {CourseContext,StudentAcademicProfile,Preferences,Section,Meeting,Schedule} from '../schemas/index.ts';
import {degreeFit,eligibility,evaluate} from './rules.ts';
import {allocateDegreeProgress} from './allocation.ts';
import {historicalGradeSignal} from './grade-signal.ts';
// Revalidate safety-critical fields at the solver boundary: cached or restored
// objects must not gain authority merely from a stale=false / scheduleKnown flag.
function fresh(timestamp:string,now:number):boolean {
 const age=now-Date.parse(timestamp);
 return Number.isFinite(age)&&age>=-5000&&age<=60000;
}
function validMeeting(m:Meeting):boolean {
 const time=/^([01]\d|2[0-3]):[0-5]\d$/;
 const date=(v:string|undefined):v is string=>!!v&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 return m.days.length>0&&m.days.every(d=>['mon','tue','wed','thu','fri','sat','sun'].includes(d))
  &&!!m.startTime&&!!m.endTime&&time.test(m.startTime)&&time.test(m.endTime)&&m.startTime<m.endTime
  &&date(m.startDate)&&date(m.endDate)&&m.startDate<=m.endDate;
}
export function overlaps(a:Meeting,b:Meeting):boolean {
 if(a.startDate&&b.endDate&&a.startDate>b.endDate||b.startDate&&a.endDate&&b.startDate>a.endDate)return false;
 if(!a.days.some(d=>b.days.includes(d)))return false;
 if(!a.startTime||!a.endTime||!b.startTime||!b.endTime)return true;
 return a.startTime<b.endTime&&b.startTime<a.endTime;
}
export function conflicts(a:Section,b:Section):boolean{return a.meetings.some(m=>b.meetings.some(n=>overlaps(m,n)));}
const minutes=(value:string)=>{const[h,m]=value.split(':').map(Number);return h*60+m;};
export function transitionTooTight(a:Section,b:Section,minimumMinutes=0):boolean{if(minimumMinutes<=0)return false;return a.meetings.some(m=>b.meetings.some(n=>{if(!m.days.some(d=>n.days.includes(d))||!m.startTime||!m.endTime||!n.startTime||!n.endTime)return false;if(m.startDate&&n.endDate&&m.startDate>n.endDate||n.startDate&&m.endDate&&n.startDate>m.endDate)return false;const gap=minutes(m.startTime)>=minutes(n.endTime)?minutes(m.startTime)-minutes(n.endTime):minutes(n.startTime)>=minutes(m.endTime)?minutes(n.startTime)-minutes(m.endTime):-1;if(gap<0)return false;const sameKnownLocation=!!m.location&&!!n.location&&m.location.trim().toLowerCase()===n.location.trim().toLowerCase();return !sameKnownLocation&&gap<minimumMinutes;}));}
export function generateSchedules(contexts:CourseContext[],profile:StudentAcademicProfile|undefined,p:Preferences){
 if(!Number.isFinite(p.minCredits)||!Number.isFinite(p.maxCredits)||p.minCredits<1||p.maxCredits>30||p.minCredits>p.maxCredits)throw new Error('Credit target must be between 1 and 30');
 if(p.earliestTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.earliestTime))throw new Error('Invalid earliest class time');
 if(p.latestTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.latestTime))throw new Error('Invalid latest class time');
 if(p.minimumTransitionMinutes!==undefined&&(!Number.isInteger(p.minimumTransitionMinutes)||p.minimumTransitionMinutes<0||p.minimumTransitionMinutes>120))throw new Error('Transition buffer must be 0–120 minutes');
 if(p.maxCampusDays!==undefined&&(!Number.isInteger(p.maxCampusDays)||p.maxCampusDays<1||p.maxCampusDays>7))throw new Error('Campus-day limit must be 1–7');
 if(contexts.length>16)throw new Error('Choose at most 16 candidate courses per run');
 const identities=new Set(contexts.flatMap(c=>c.course.data?[`${c.course.data.campus}:${c.course.data.term}`]:[]));
 if(identities.size>1)throw new Error('All courses in a schedule must use the same term and campus');
 const now=Date.now();
 const rejected:{code:string;reason:string}[]=[];const options:{ctx:CourseContext;bundles:Section[][]}[]=[];
 const seen=new Set<string>();
 for(const ctx of contexts){const c=ctx.course.data;if(!c)continue;if(seen.has(c.code))continue;seen.add(c.code);
 const e=eligibility(c,profile);let reason=e.result!=='yes'?e.reason:!degreeFit(c,profile).some(f=>f.result==='yes')?'No proven remaining requirement match':ctx.sections.stale||ctx.course.stale||!fresh(ctx.sections.provenance.retrievedAt,now)||!fresh(ctx.course.provenance.retrievedAt,now)?'Availability is stale; refresh before planning':(typeof c.credits!=='number'||!Number.isFinite(c.credits)||c.credits<=0)?'Variable or invalid credits require review':'';
 const all=ctx.sections.data||[];const allowed=(s:Section)=>{const seats=s.capacity!==undefined&&s.enrolled!==undefined&&Number.isInteger(s.capacity)&&Number.isInteger(s.enrolled)&&s.enrolled>=0&&s.capacity>s.enrolled;const waitlist=!!p.allowWaitlist&&s.waitlistCapacity!==undefined&&s.waitlistTotal!==undefined&&Number.isInteger(s.waitlistCapacity)&&Number.isInteger(s.waitlistTotal)&&s.waitlistCapacity>s.waitlistTotal;return s.term===c.term&&s.courseCode===c.code&&(!s.campus||s.campus===c.campus)&&(!s.institution||s.institution===c.institution)&&fresh(s.provenance.retrievedAt,now)&&(s.open===true||waitlist)&&(seats||waitlist)&&s.scheduleKnown&&s.meetings.length>0&&s.meetings.every(validMeeting)&&!s.unresolvedLinks&&!s.restrictions.length&&evaluate(s.prerequisiteRule,[...(profile?.completedCourses||[]),...(profile?.transferCourses||[])])==='yes'&&s.meetings.every(m=>(!p.noFriday||!m.days.includes('fri'))&&(!p.earliestTime||!!m.startTime&&m.startTime>=p.earliestTime)&&(!p.latestTime||!!m.endTime&&m.endTime<=p.latestTime));};
 const components=new Set(all.map(s=>s.component));
 const bundles=all.filter(s=>s.enrollable!==false&&(s.linkedClassNumbers.length>0||['LEC','Lecture','SEM','Seminar'].includes(s.component))).flatMap(s=>{const linked=s.linkedClassNumbers.map(id=>all.find(x=>x.classNumber===id));if(linked.some(x=>!x))return[];const bundle=[s,...linked as Section[]];if(components.size>1&&[...components].some(component=>!bundle.some(s=>s.component===component)))return[];if(!bundle.every(allowed)||bundle.some((x,i)=>bundle.slice(i+1).some(y=>conflicts(x,y))))return[];return[bundle];});
 if(!reason&&!bundles.length)reason='No verified open section bundle meets timing, linkage and restriction constraints';if(reason)rejected.push({code:c.code,reason});else options.push({ctx,bundles});
 }
 const results:Schedule[]=[];let explored=0;const maxNodes=25000;
 function visit(i:number,sections:Section[],chosen:CourseContext[],credits:number){if(++explored>maxNodes)return;if(credits>p.maxCredits)return;if(i===options.length){if(credits>=p.minCredits&&chosen.length){const courses=chosen.map(c=>c.course.data!),degreeProgress=allocateDegreeProgress(courses,profile);const campusDays=new Set(sections.filter(s=>!/online/i.test(s.instructionMode)).flatMap(s=>s.meetings.flatMap(m=>m.days))).size;if(p.maxCampusDays&&campusDays>p.maxCampusDays)return;const allocationNote=degreeProgress.totalTargets?`${degreeProgress.fullyCoveredTargets} of ${degreeProgress.totalTargets} supported remaining requirement targets fully covered by this plan`:'Cross-requirement allocation needs review for the remaining rule structure',waitlisted=sections.filter(s=>s.capacity!==undefined&&s.enrolled!==undefined&&s.capacity<=s.enrolled);results.push({id:sections.map(s=>s.classNumber).sort().join('-'),sections,courses,credits,campusDays,degreeProgress,explanations:[`${credits} credits within your target`,'No meeting overlaps; dates included',...(p.minimumTransitionMinutes?[`At least ${p.minimumTransitionMinutes} minutes between different-location classes when required`]:[]),'Every course matches a supported remaining APAS rule',allocationNote,'Each planned course is allocated to at most one supported remaining requirement','Completed-course prerequisites verified; unknown restrictions excluded',...(waitlisted.length?[`${waitlisted.length} section${waitlisted.length===1?' is':'s are'} waitlist-only; enrollment is not guaranteed`]:[]),'Final degree applicability remains subject to APAS and registration rules']});}return;}
 visit(i+1,sections,chosen,credits);const o=options[i],course=o.ctx.course.data!;const equivalentAlreadyChosen=chosen.some(ctx=>{const other=ctx.course.data!;return course.equivalents.includes(other.code)||other.equivalents.includes(course.code);});if(equivalentAlreadyChosen)return;for(const b of o.bundles){if(!b.some(s=>sections.some(t=>conflicts(s,t)||transitionTooTight(s,t,p.minimumTransitionMinutes||0))))visit(i+1,[...sections,...b],[...chosen,o.ctx],credits+(course.credits as number));}}
 visit(0,[],[],0);for(const s of results){const count=preferredInstructorCount(s.sections,p.preferredInstructors);if(count)s.explanations.push(`${count} of your preferred instructors in this option; your choice is used only after degree coverage and timing preferences`);}
 const gradeSignals=new Map(results.map(s=>[s.id,historicalGradeSignal(s,contexts)]));
 results.sort((a,b)=>{
  const coverage=(b.degreeProgress?.coverageScore||0)-(a.degreeProgress?.coverageScore||0)||(b.degreeProgress?.fullyCoveredTargets||0)-(a.degreeProgress?.fullyCoveredTargets||0);
  if(coverage)return coverage;
  if(p.planningGoal==='lightLoad'&&a.credits!==b.credits)return a.credits-b.credits;
  if(p.planningGoal==='gradeHistory'){
   const ga=gradeSignals.get(a.id),gb=gradeSignals.get(b.id);
   if(!!ga!==!!gb)return ga?-1:1;
   if(ga&&gb&&Math.abs(ga.aRangeShare-gb.aRangeShare)>1e-9)return gb.aRangeShare-ga.aRangeShare;
  }
  return(b.degreeProgress?.allocatedCredits||0)-(a.degreeProgress?.allocatedCredits||0)||(p.fewestDays?a.campusDays-b.campusDays:0)||(p.preferOnline?b.sections.filter(s=>/online/i.test(s.instructionMode)).length-a.sections.filter(s=>/online/i.test(s.instructionMode)).length:0)||preferredInstructorCount(b.sections,p.preferredInstructors)-preferredInstructorCount(a.sections,p.preferredInstructors)||b.credits-a.credits||a.id.localeCompare(b.id);
 });
 return{schedules:results.slice(0,8),rejected,explored,truncated:explored>maxNodes,candidateCourses:options.length};
}
