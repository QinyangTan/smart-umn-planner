import type{Course,DegreeRequirement,DegreeProgressSummary,RequirementAllocation,RequirementRule,StudentAcademicProfile}from'../schemas/index.ts';
import{degreeCandidateFit,degreeFit,eligibility,degreeDiscoveryPlan,discoverDegreeCandidates,matches,profileRequirementRoots}from'./rules.ts';

type Target={req:DegreeRequirement; unit:'credits'|'courses'; demand:number; matcher:RequirementRule; gradeSensitive:boolean; specificity:number};

function specificity(rule:RequirementRule):number{
 switch(rule.type){
  case'course':return 6;
  case'range':return 5;
  case'attribute':return 4.5;
  case'exclude':return specificity(rule.rule)+0.25;
  case'anyOf':return Math.max(1,...rule.rules.map(specificity))-1;
  case'allOf':return rule.rules.length===1?specificity(rule.rules[0]):0;
  case'credits':case'count':return specificity(rule.rule);
  case'gpa':return specificity(rule.rule);
  case'unknown':case'policy':case'condition':return 0;
 }
}
function baseDemand(req:DegreeRequirement,rule:RequirementRule):Omit<Target,'req'|'matcher'|'specificity'>|null{
 switch(rule.type){
  case'credits':{
   const remaining=req.remainingCredits??Math.max(0,rule.minimum-(req.appliedCredits||0)-(req.inProgressCredits||0));
   return remaining>0?{unit:'credits',demand:remaining,gradeSensitive:false}:null;
  }
  case'count':{
   const used=new Set(req.coursesUsed).size,remaining=req.remainingCount??Math.max(0,rule.minimum-used-(req.inProgressCount||0));
   return remaining>0?{unit:'courses',demand:remaining,gradeSensitive:false}:null;
  }
  case'gpa':{const inner=baseDemand(req,rule.rule);return inner?{...inner,gradeSensitive:true}:null;}
  case'course':case'range':case'attribute':case'anyOf':case'exclude':return{unit:'courses',demand:1,gradeSensitive:false};
  case'allOf':return rule.rules.length===1?baseDemand(req,rule.rules[0]):null;
  case'unknown':case'policy':case'condition':return null;
 }
}
function targetFor(req:DegreeRequirement):Target|null{
 if(req.status!=='incomplete'&&req.status!=='in_progress')return null;
 const demand=baseDemand(req,req.rule),spec=specificity(req.rule);
 return demand&&spec>0?{req,matcher:req.rule,specificity:spec,...demand}:null;
}
// Prefer the deepest supported requirement. A supported parent containing supported
// child requirements is normally an APAS aggregate, so using both would create an
// artificial double-count opportunity.
function targets(rs:DegreeRequirement[]):Target[]{
 const out:Target[]=[];
 for(const req of rs){
  const child=targets(req.children);
  if(child.length)out.push(...child);
  else{const t=targetFor(req);if(t)out.push(t);}
 }
 return out;
}
function contribution(course:Course,target:Target):number{
 if(matches(target.matcher,course)!=='yes')return 0;
 return target.unit==='courses'?1:typeof course.credits==='number'&&course.credits>0?course.credits:0;
}
export function selectDegreeCandidatePool(courses:Course[],profile?:StudentAcademicProfile,limit=16):Course[]{
 if(!Number.isInteger(limit)||limit<1||limit>64)throw Error('Candidate pool limit must be between 1 and 64');if(!profile)return[];
 const all=discoverDegreeCandidates(courses,profile).filter(c=>c.sectionIds.length>0),ts=targets(profileRequirementRoots(profile)),exact=new Set(degreeDiscoveryPlan(profile,all[0]?.campus).explicitCodes),key=(c:Course)=>`${c.campus}:${c.code}`;
 const fits=new Map(all.map(c=>[key(c),ts.map((t,ti)=>contribution(c,t)>0?ti:-1).filter(ti=>ti>=0)]));const selected:Course[]=[],used=new Set<string>();
 // Preserve actionable candidates before filling the bounded pool with routes
 // that still require prerequisite or degree-rule review. Balance targets within
 // each tier; a high section count is never proof of prerequisite eligibility.
 const ready=all.filter(c=>eligibility(c,profile).result==='yes'&&degreeFit(c,profile).some(f=>f.result==='yes'));
 for(const tier of [ready,all.filter(c=>!ready.includes(c))]){
  const reqOrder=ts.map((t,ti)=>({ti,t,count:tier.filter(c=>fits.get(key(c))!.includes(ti)).length})).filter(x=>x.count>0).sort((a,b)=>a.count-b.count||b.t.specificity-a.t.specificity||a.t.req.id.localeCompare(b.t.req.id));
  while(selected.length<limit){
   let progressed=false;
   for(const {ti} of reqOrder){
    if(selected.length>=limit)break;
    const choice=tier.filter(c=>!used.has(key(c))&&fits.get(key(c))!.includes(ti)).sort((a,b)=>Number(exact.has(b.code))-Number(exact.has(a.code))||fits.get(key(a))!.length-fits.get(key(b))!.length||b.sectionIds.length-a.sectionIds.length||a.code.localeCompare(b.code))[0];
    if(choice){selected.push(choice);used.add(key(choice));progressed=true;}
   }
   if(!progressed)break;
  }
  if(selected.length<limit){
   const remainder=tier.filter(c=>!used.has(key(c))).sort((a,b)=>degreeCandidateFit(b,profile).filter(x=>x.result==='yes').length-degreeCandidateFit(a,profile).filter(x=>x.result==='yes').length||Number(exact.has(b.code))-Number(exact.has(a.code))||b.sectionIds.length-a.sectionIds.length||a.code.localeCompare(b.code));
   for(const c of remainder.slice(0,limit-selected.length)){selected.push(c);used.add(key(c));}
  }
 }
 return selected;
}
export function allocateDegreeProgress(courses:Course[],profile?:StudentAcademicProfile):DegreeProgressSummary{
 const ts=profile?targets(profileRequirementRoots(profile)):[],remaining=ts.map(t=>t.demand),assignments:string[][]=ts.map(()=>[]);
 const unique=[...new Map(courses.map(c=>[`${c.campus}:${c.code}`,c])).values()],unassigned=new Set(unique.map((_,i)=>i)),assigned=new Set<number>();
 while(true){
  const candidates=[...unassigned].map(ci=>{
   const available=ts.map((t,ti)=>({ti,amount:remaining[ti]>0?contribution(unique[ci],t):0})).filter(x=>x.amount>0);
   return{ci,available};
  }).filter(x=>x.available.length);
  if(!candidates.length)break;
  const targetScarcity=(ti:number)=>[...unassigned].filter(ci=>remaining[ti]>0&&contribution(unique[ci],ts[ti])>0).length;
  candidates.sort((a,b)=>a.available.length-b.available.length||Math.min(...a.available.map(x=>targetScarcity(x.ti)))-Math.min(...b.available.map(x=>targetScarcity(x.ti)))||unique[a.ci].code.localeCompare(unique[b.ci].code));
  const pick=candidates[0],course=unique[pick.ci];
  pick.available.sort((a,b)=>targetScarcity(a.ti)-targetScarcity(b.ti)||ts[b.ti].specificity-ts[a.ti].specificity||Math.min(b.amount,remaining[b.ti])/remaining[b.ti]-Math.min(a.amount,remaining[a.ti])/remaining[a.ti]||ts[a.ti].req.id.localeCompare(ts[b.ti].req.id));
  const ti=pick.available[0].ti,applied=Math.min(contribution(course,ts[ti]),remaining[ti]);
  if(applied>0){remaining[ti]-=applied;assignments[ti].push(course.code);assigned.add(pick.ci);}
  unassigned.delete(pick.ci);
 }
 const allocations:RequirementAllocation[]=ts.map((t,i)=>({requirementId:t.req.id,label:t.req.label,unit:t.unit,target:t.demand,applied:t.demand-remaining[i],remaining:remaining[i],courseCodes:assignments[i],gradeSensitive:t.gradeSensitive}));
 const coverageScore=allocations.reduce((s,a)=>s+(a.target?Math.min(1,a.applied/a.target):0),0),fullyCoveredTargets=allocations.filter(a=>a.target>0&&a.remaining<=1e-9).length;
 const allocatedCredits=[...assigned].reduce((s,i)=>s+(typeof unique[i].credits==='number'?unique[i].credits:0),0);
 return{allocations,unallocatedCourseCodes:unique.filter((_,i)=>!assigned.has(i)).map(c=>c.code),fullyCoveredTargets,totalTargets:allocations.length,coverageScore:Number(coverageScore.toFixed(6)),allocatedCredits};
}
