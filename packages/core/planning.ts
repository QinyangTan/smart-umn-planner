import type {CourseContext,Preferences,Schedule,StudentAcademicProfile} from '../schemas/index.ts';
import {analyzeRequirementRouteCoverage,degreeFit,evaluate,flattenRequirements} from './rules.ts';
export{compatibilityPassport,compatibilityReport}from'./compatibility.ts';

export type TermSeason='Spring'|'Summer'|'Fall';
export type OfferingPattern={code:string;observedTerms:string[];seasons:TermSeason[];confidence:'strong'|'limited'|'unknown';label:string;seasonCounts:Record<TermSeason,number>};
export type ReviewGuidance={kind:'prerequisite'|'capacity'|'policy'|'stale'|'restriction'|'offering'|'unknown';title:string;action:string};
export type RoadmapSemester={term:string;label:string;targetCredits:number;courseCodes:string[];note:string};
export type GraduationRoadmap={headline:string;estimatedGraduation:string;semesters:RoadmapSemester[];bottlenecks:string[];reviewItems:string[];confidence:'strong'|'bounded'|'review';remainingCredits:number};
export type WhatIfScenario={primaryOnly?:boolean;includeSummer?:boolean;creditsPerTerm?:number;dropCourseCode?:string};
export type AdvisorDecision={kind:'register'|'bottleneck'|'review'|'roadmap';title:string;detail:string;courseCode?:string};
export type AdvisorBrief={status:'ready'|'attention'|'build';headline:string;summary:string;nextDecisions:AdvisorDecision[];reviewCount:number;estimatedGraduation:string};

const seasons:Record<string,TermSeason>={'3':'Spring','5':'Summer','9':'Fall'};
export function termSeason(term:string):TermSeason{const s=seasons[term.at(-1)||''];if(!s)throw new Error('Unsupported UMN term');return s;}
export function termYear(term:string):number{if(!/^1\d{2}[359]$/.test(term))throw new Error('Invalid UMN term');return 2000+Number(term.slice(1,3));}
export function termDisplay(term:string){return `${termSeason(term)} ${termYear(term)}`;}
function makeTerm(year:number,season:TermSeason){const yy=String(year%100).padStart(2,'0'),suffix=season==='Spring'?'3':season==='Summer'?'5':'9';return `1${yy}${suffix}`;}
export function nextPlanningTerm(term:string,includeSummer=false):string{
 const year=termYear(term),season=termSeason(term);
 if(season==='Spring')return includeSummer?makeTerm(year,'Summer'):makeTerm(year,'Fall');
 if(season==='Summer')return makeTerm(year,'Fall');
 return makeTerm(year+1,'Spring');
}
export function futurePlanningTerms(anchor:string,count:number,includeSummer=false):string[]{const out:string[]=[];let t=anchor;for(let i=0;i<count;i++){out.push(t);t=nextPlanningTerm(t,includeSummer);}return out;}

export function offeringPattern(ctx:CourseContext):OfferingPattern{
 const course=ctx.course.data,code=course?.code||'Unknown course';
 const observed=new Set<string>();
 for(const d of ctx.grades.data?.distributions||[])if(/^1\d{2}[359]$/.test(d.term))observed.add(d.term);
 if(course?.term)observed.add(course.term);
 const observedTerms=[...observed].sort();
 const seasonCounts:Record<TermSeason,number>={Spring:0,Summer:0,Fall:0};
 for(const t of observedTerms)seasonCounts[termSeason(t)]++;
 const seasonList=(Object.entries(seasonCounts) as [TermSeason,number][]).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([s])=>s);
 const confidence=observedTerms.length>=6?'strong':observedTerms.length>=2?'limited':'unknown';
 const label=!observedTerms.length?'No historical offering signal':seasonList.length===3?'Observed across Fall, Spring and Summer':seasonList.length?`Observed most often in ${seasonList.join(' / ')}`:'Offering pattern unavailable';
 return{code,observedTerms,seasons:seasonList,confidence,label,seasonCounts};
}
export function likelyInTerm(pattern:OfferingPattern,term:string):boolean|undefined{
 if(pattern.confidence==='unknown')return undefined;
 const count=pattern.seasonCounts[termSeason(term)];
 if(count>0)return true;
 return pattern.observedTerms.length>=4?false:undefined;
}

export function actionableReview(reason:string):ReviewGuidance{
 const r=reason.toLowerCase();
 if(/prereq|standing|consent|permission/.test(r))return{kind:'prerequisite',title:'Prerequisite review',action:'Open the official course details. If the condition is consent or standing-based, confirm it with the department or instructor before relying on this course.'};
 if(/restrict|reserved|linked/.test(r))return{kind:'restriction',title:'Registration restriction',action:'Open Schedule Builder and verify reserved seats, linked components, or registration restrictions.'};
 if(/seat|capacity|waitlist|open section/.test(r))return{kind:'capacity',title:'Section availability',action:'Refresh live sections and check the official waitlist before registration.'};
 if(/resid|gpa|double.?count|cap|policy/.test(r))return{kind:'policy',title:'Degree policy review',action:'Confirm this rule in APAS or with your advisor. Smart UMN will not guess a degree-wide policy.'};
 if(/stale|refresh/.test(r))return{kind:'stale',title:'Refresh required',action:'Refresh official UMN data before using this result for registration.'};
 if(/offer|term|semester/.test(r))return{kind:'offering',title:'Future offering uncertainty',action:'Use the historical pattern as a planning signal only; confirm the future term when UMN publishes it.'};
 return{kind:'unknown',title:'Advisor review',action:'Smart UMN cannot prove this condition. Keep it out of the automatic plan until APAS or an advisor confirms it.'};
}

function roadmapProfile(profile:StudentAcademicProfile,scenario:WhatIfScenario):StudentAcademicProfile{return scenario.primaryOnly?{...profile,additionalPrograms:[]}:profile;}
export function buildGraduationRoadmap(profile:StudentAcademicProfile,currentTerm:string,currentSchedule:Schedule|undefined,contexts:CourseContext[],prefs:Preferences,scenario:WhatIfScenario={}):GraduationRoadmap{
 const p=roadmapProfile(profile,scenario),coverage=analyzeRequirementRouteCoverage(p).overall;
 const creditsPerTerm=Math.max(1,Math.min(30,scenario.creditsPerTerm||prefs.maxCredits||12));
 const startingRemaining=Math.max(0,p.degreeCredits.remaining??flattenRequirements(p.requirements).reduce((sum,r)=>sum+(r.status==='incomplete'?(r.remainingCredits||0):0),0));
 const currentCredits=currentSchedule?.credits||0,remainingCredits=Math.max(0,startingRemaining-currentCredits);
 const additionalTerms=Math.max(0,Math.ceil(remainingCredits/creditsPerTerm));
 const terms=futurePlanningTerms(currentTerm,Math.max(1,additionalTerms+1),!!scenario.includeSummer);
 const patterns=new Map(contexts.map(c=>[c.course.data?.code,offeringPattern(c)]));
 const chosen=currentSchedule?.courses.filter(c=>c.code!==scenario.dropCourseCode)||[];
 const semesters:RoadmapSemester[]=[];
 semesters.push({term:currentTerm,label:termDisplay(currentTerm),targetCredits:currentCredits||Math.min(creditsPerTerm,startingRemaining),courseCodes:chosen.map(c=>c.code),note:chosen.length?'Current generated option; live sections verified at build time.':'No current schedule selected yet.'});
 let left=Math.max(0,remainingCredits+(scenario.dropCourseCode?(currentSchedule?.courses.find(c=>c.code===scenario.dropCourseCode)?.credits as number||0):0));
 const planned=[...p.completedCourses,...p.transferCourses,...chosen.map(c=>({courseCode:c.code,campus:c.campus,subject:c.subject,number:c.catalogNumber,credits:typeof c.credits==='number'?c.credits:undefined,grade:'P',status:'completed' as const}))];
 const already=new Set(chosen.map(c=>c.code));
 const futureCandidates=contexts.map(c=>c.course.data).filter((c):c is NonNullable<typeof c>=>!!c&&typeof c.credits==='number'&&degreeFit(c,p).some(f=>f.result==='yes')&&!already.has(c.code)).sort((a,b)=>{const pa=patterns.get(a.code),pb=patterns.get(b.code);const sa=pa?.seasons.length??3,sb=pb?.seasons.length??3;return sa-sb||a.code.localeCompare(b.code);});
 for(const t of terms.slice(1)){if(left<=0)break;const target=Math.min(creditsPerTerm,left),assigned:string[]=[];let assignedCredits=0;for(const c of futureCandidates){if(already.has(c.code)||assignedCredits+(c.credits as number)>target)continue;const pattern=patterns.get(c.code);if(!pattern||likelyInTerm(pattern,t)!==true)continue;if(evaluate(c.prerequisiteRule,planned)!=='yes')continue;assigned.push(c.code);assignedCredits+=c.credits as number;already.add(c.code);planned.push({courseCode:c.code,campus:c.campus,subject:c.subject,number:c.catalogNumber,credits:c.credits as number,grade:'P',status:'completed'});}semesters.push({term:t,label:termDisplay(t),targetCredits:target,courseCodes:assigned,note:assigned.length?`${assignedCredits} credits are evidence-backed from current APAS matches, historical reported terms, and prerequisite order assuming successful completion of earlier planned courses; the rest remains unassigned until future offerings publish.`:'Target load only. Exact courses remain unassigned until UMN publishes enough future-offering evidence.'});left-=target;}
 const seasonal=contexts.map(c=>c.course.data?.code&&patterns.get(c.course.data.code)).filter((x):x is OfferingPattern=>!!x&&x.confidence!=='unknown'&&x.seasons.length<3);
 const bottlenecks:string[]=[];
 if(seasonal.length)bottlenecks.push(...seasonal.slice(0,3).map(x=>`${x.code}: ${x.label}`));
 if(coverage.candidateRouteSupportedRequirements)bottlenecks.push(`${coverage.candidateRouteSupportedRequirements} remaining requirement route${coverage.candidateRouteSupportedRequirements===1?'':'s'} still depend on caps or conditions.`);
 if(coverage.policyConstraints)bottlenecks.push(`${coverage.policyConstraints} policy/accounting constraint${coverage.policyConstraints===1?'':'s'} still need APAS/advisor confirmation.`);
 const reviewItems:string[]=[];
 if(coverage.unknownUnroutedRequirements)reviewItems.push(`${coverage.unknownUnroutedRequirements} remaining requirement${coverage.unknownUnroutedRequirements===1?'':'s'} cannot yet be translated into a course-authorizing rule.`);
 for(const c of contexts){const reason=c.course.data?.prerequisiteRule.type==='unknown'?c.course.data.prerequisiteRule.reason:'';if(reason)reviewItems.push(`${c.course.data?.code}: ${actionableReview(reason).action}`);}
 const estimated=semesters.at(-1)?.label||termDisplay(currentTerm);
 const confidence=coverage.unknownUnroutedRequirements?'review':coverage.policyConstraints||coverage.candidateRouteSupportedRequirements?'bounded':'strong';
 const headline=remainingCredits<=0?'Current plan reaches the recorded degree-credit total.':`About ${Math.max(1,semesters.length)} planning term${semesters.length===1?'':'s'} to the recorded degree-credit total at up to ${creditsPerTerm} credits/term.`;
 return{headline,estimatedGraduation:estimated,semesters,bottlenecks:[...new Set(bottlenecks)],reviewItems:[...new Set(reviewItems)].slice(0,8),confidence,remainingCredits};
}

export function buildAdvisorBrief(profile:StudentAcademicProfile,currentTerm:string,currentSchedule:Schedule|undefined,contexts:CourseContext[],prefs:Preferences,scenario:WhatIfScenario={}):AdvisorBrief{
 const road=buildGraduationRoadmap(profile,currentTerm,currentSchedule,contexts,prefs,scenario),coverage=analyzeRequirementRouteCoverage(roadmapProfile(profile,scenario)).overall;
 const reviewCount=road.reviewItems.length+coverage.policyConstraints+coverage.candidateRouteSupportedRequirements;
 const status:AdvisorBrief['status']=!currentSchedule?'build':reviewCount?'attention':'ready';
 const headline=!currentSchedule?'Let’s choose the next registration move.':road.confidence==='strong'?`Current evidence supports a path through ${road.estimatedGraduation}.`:`Current evidence points to ${road.estimatedGraduation}, with a few items to confirm.`;
 const summary=!currentSchedule?`${coverage.strictSupportedRequirements} proven course route${coverage.strictSupportedRequirements===1?'':'s'} can be used automatically; ${reviewCount} item${reviewCount===1?'':'s'} still need review.`:`${currentSchedule.credits} credits are planned this term across ${currentSchedule.campusDays} campus day${currentSchedule.campusDays===1?'':'s'}. ${reviewCount?`${reviewCount} review item${reviewCount===1?'':'s'} remain outside automatic authority.`:'No current review-only item blocks this generated option.'}`;
 const nextDecisions:AdvisorDecision[]=[];
 if(currentSchedule){const narrow=currentSchedule.courses.map(c=>({c,p:contexts.find(x=>x.course.data?.code===c.code)})).map(x=>({c:x.c,p:x.p?offeringPattern(x.p):undefined})).find(x=>x.p&&x.p.confidence!=='unknown'&&x.p.seasons.length<3);if(narrow?.p)nextDecisions.push({kind:'bottleneck',title:`Protect ${narrow.c.code} in this plan`,detail:`${narrow.p.label}. Keeping it now reduces future offering risk.`,courseCode:narrow.c.code});nextDecisions.push({kind:'register',title:`Prepare ${currentSchedule.courses.length} course${currentSchedule.courses.length===1?'':'s'} for registration`,detail:'Review the generated class numbers, refresh live seats, then finish enrollment in official UMN systems.'});}
 else nextDecisions.push({kind:'register',title:'Build this semester first',detail:'Smart UMN will match current offerings only to course-authorizing APAS rules with verified prerequisites.'});
 if(road.bottlenecks.length)nextDecisions.push({kind:'bottleneck',title:'Watch the graduation bottleneck',detail:road.bottlenecks[0]});
 if(road.reviewItems.length)nextDecisions.push({kind:'review',title:'Use an advisor only where policy judgment is still needed',detail:road.reviewItems[0]});else if(coverage.policyConstraints)nextDecisions.push({kind:'review',title:'Confirm degree-wide policy constraints',detail:`${coverage.policyConstraints} APAS policy/accounting constraint${coverage.policyConstraints===1?'':'s'} remain visible but do not authorize courses automatically.`});
 nextDecisions.push({kind:'roadmap',title:`Keep ${road.estimatedGraduation} as the current planning horizon`,detail:'This is a deterministic estimate from recorded credits, supported requirements, prerequisite order and observed offering patterns — not a graduation guarantee.'});
 return{status,headline,summary,nextDecisions:nextDecisions.slice(0,4),reviewCount,estimatedGraduation:road.estimatedGraduation};
}

export function whyThisPlan(schedule:Schedule,prefs:Preferences,contexts:CourseContext[]=[]):string[]{
 const why:string[]=[];const dp=schedule.degreeProgress;
 if(dp?.totalTargets)why.push(`Covers ${dp.fullyCoveredTargets} of ${dp.totalTargets} supported remaining APAS targets in this term.`);
 why.push(`${schedule.credits} credits across ${schedule.campusDays} campus day${schedule.campusDays===1?'':'s'} with no meeting overlap.`);
 if(prefs.noFriday&&!schedule.sections.some(s=>s.meetings.some(m=>m.days.includes('fri'))))why.push('Keeps Friday free, matching your preference.');
 if(prefs.earliestTime)why.push(`All verified meetings start at or after ${prefs.earliestTime}.`);
 if(prefs.latestTime)why.push(`All verified meetings finish by ${prefs.latestTime}.`);
 if(prefs.minimumTransitionMinutes)why.push(`Different-location class transitions preserve at least ${prefs.minimumTransitionMinutes} minutes when required.`);
 const online=schedule.sections.filter(s=>/online/i.test(s.instructionMode)).length;if(prefs.preferOnline&&online)why.push(`${online} selected section${online===1?' is':'s are'} online.`);
 const patternNotes=schedule.courses.map(c=>{const ctx=contexts.find(x=>x.course.data?.code===c.code);if(!ctx)return'';const p=offeringPattern(ctx);return p.confidence!=='unknown'&&p.seasons.length<3?`${c.code} has a narrower historical offering pattern (${p.seasons.join('/')}).`:'';}).filter(Boolean);
 why.push(...patternNotes.slice(0,2));return why;
}
