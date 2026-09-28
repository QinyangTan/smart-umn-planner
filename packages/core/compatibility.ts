import type{AcademicProgram,StudentAcademicProfile,StudentCourse}from'../schemas/index.ts';
import{analyzeRequirementRouteCoverage,flattenRequirements}from'./rules.ts';

export const APAS_COMPATIBILITY_KIND='smart-umn-anonymous-apas-compatibility' as const;
export const APAS_COMPATIBILITY_CORPUS_KIND='smart-umn-anonymous-apas-compatibility-corpus' as const;
export const APAS_COMPATIBILITY_SCHEMA_VERSION=1 as const;
export type APASProgramKind=NonNullable<AcademicProgram['kind']>;
export type APASCompatibilityPassport={
 schemaVersion:typeof APAS_COMPATIBILITY_SCHEMA_VERSION;
 fingerprint:string;parserVersion:string;programCount:number;programKinds:APASProgramKind[];
 openRequirements:number;strictRoutes:number;candidateRoutes:number;policyConstraints:number;recognizedPolicyRules:number;unclassifiedPolicyConstraints:number;aggregateContainers:number;unresolved:number;
 transferCourseCount:number;apCreditCount:number;ibCreditCount:number;otherTestCreditCount:number;nonTestTransferCount:number;inProgressCourseCount:number;warnings:number;
};
export type APASCompatibilityReport=APASCompatibilityPassport&{kind:typeof APAS_COMPATIBILITY_KIND;generatedAt:string};
export type APASCompatibilityCorpus={kind:typeof APAS_COMPATIBILITY_CORPUS_KIND;schemaVersion:typeof APAS_COMPATIBILITY_SCHEMA_VERSION;reports:APASCompatibilityReport[]};
export type APASCompatibilityCorpusSummary={reports:number;uniqueFingerprints:number;parserVersions:string[];programKinds:Record<APASProgramKind,number>;multiProgramReports:number;apCreditReports:number;ibCreditReports:number;otherTestCreditReports:number;nonTestTransferReports:number;inProgressReports:number;warningReports:number;unresolvedReports:number;unclassifiedPolicyReports:number};

const PROGRAM_KINDS:APASProgramKind[]=['degree','major','minor','certificate','what_if','unknown'];
const REPORT_KEYS=['kind','schemaVersion','generatedAt','fingerprint','parserVersion','programCount','programKinds','openRequirements','strictRoutes','candidateRoutes','policyConstraints','recognizedPolicyRules','unclassifiedPolicyConstraints','aggregateContainers','unresolved','transferCourseCount','apCreditCount','ibCreditCount','otherTestCreditCount','nonTestTransferCount','inProgressCourseCount','warnings'] as const;
const CORPUS_KEYS=['kind','schemaVersion','reports'] as const;

function ruleFamily(r:ReturnType<typeof flattenRequirements>[number]):string{const rule=r.rule.type==='policy'?`policy:${r.rule.family}`:r.rule.type,candidate=r.candidateRule?.type==='policy'?`policy:${r.candidateRule.family}`:r.candidateRule?.type||'-';return`${rule}:${candidate}:${r.requiredCredits!==undefined?'cr':''}${r.requiredCount!==undefined?'ct':''}${r.requiredGpa!==undefined?'gpa':''}`;}
function transferKinds(courses:StudentCourse[]){let ap=0,ib=0,other=0;for(const c of courses){const s=(c.transferSource||'').trim();if(/\bAdvanced Placement\b/i.test(s))ap++;else if(/\bInternational Baccalaureate\b/i.test(s))ib++;else if(/\b(?:CLEP|Cambridge|A[- ]?Level|exam(?:ination)? credit|test credit)\b/i.test(s))other++;}return{apCreditCount:ap,ibCreditCount:ib,otherTestCreditCount:other,nonTestTransferCount:Math.max(0,courses.length-ap-ib-other)};}
export function compatibilityPassport(profile:StudentAcademicProfile):APASCompatibilityPassport{
 const coverage=analyzeRequirementRouteCoverage(profile).overall,roots=[...profile.requirements,...(profile.additionalPrograms||[]).flatMap(p=>p.requirements)],open=flattenRequirements(roots).filter(r=>r.status==='incomplete'||r.status==='in_progress'),signature=open.map(r=>ruleFamily(r)).sort().join('|');
 let hash=2166136261;for(const ch of signature){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const transfer=transferKinds(profile.transferCourses);
 return{schemaVersion:APAS_COMPATIBILITY_SCHEMA_VERSION,fingerprint:(hash>>>0).toString(16).padStart(8,'0'),parserVersion:profile.parserVersion,programCount:1+(profile.additionalPrograms?.length||0),programKinds:[profile.program.kind||'unknown',...(profile.additionalPrograms||[]).map(p=>p.program.kind||'unknown')],openRequirements:coverage.totalActiveRemainingRequirements,strictRoutes:coverage.strictSupportedRequirements,candidateRoutes:coverage.candidateRouteSupportedRequirements,policyConstraints:coverage.policyConstraints,recognizedPolicyRules:coverage.recognizedPolicyRules,unclassifiedPolicyConstraints:coverage.unclassifiedPolicyConstraints,aggregateContainers:coverage.aggregateContainers,unresolved:coverage.unknownUnroutedRequirements,transferCourseCount:profile.transferCourses.length,...transfer,inProgressCourseCount:profile.inProgressCourses.length,warnings:profile.warnings.length};
}
export function compatibilityReport(profile:StudentAcademicProfile,generatedAt=new Date().toISOString()):APASCompatibilityReport{return{kind:APAS_COMPATIBILITY_KIND,generatedAt,...compatibilityPassport(profile)};}

function object(value:unknown,label:string):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be an object`);return value as Record<string,unknown>;}
function exactKeys(value:Record<string,unknown>,keys:readonly string[],label:string){for(const key of Object.keys(value))if(!keys.includes(key))throw new Error(`${label} contains forbidden field ${key}`);for(const key of keys)if(!(key in value))throw new Error(`${label} is missing field ${key}`);}
function count(value:Record<string,unknown>,key:string,max=100000):number{const n=value[key];if(!Number.isInteger(n)||Number(n)<0||Number(n)>max)throw new Error(`${key} must be a nonnegative integer <= ${max}`);return Number(n);}
export function parseCompatibilityReport(input:unknown):APASCompatibilityReport{
 const v=object(input,'Compatibility report');exactKeys(v,REPORT_KEYS,'Compatibility report');
 if(v.kind!==APAS_COMPATIBILITY_KIND)throw new Error('Invalid compatibility report kind');if(v.schemaVersion!==APAS_COMPATIBILITY_SCHEMA_VERSION)throw new Error('Unsupported compatibility schema version');
 if(typeof v.generatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v.generatedAt)||!Number.isFinite(Date.parse(v.generatedAt)))throw new Error('generatedAt must be an ISO UTC timestamp');
 if(typeof v.fingerprint!=='string'||!/^[0-9a-f]{8}$/.test(v.fingerprint))throw new Error('Invalid compatibility fingerprint');
 if(typeof v.parserVersion!=='string'||!/^[0-9A-Za-z._-]{1,32}$/.test(v.parserVersion))throw new Error('Invalid parser version');
 const programCount=count(v,'programCount',20);if(!Array.isArray(v.programKinds)||v.programKinds.length!==programCount||v.programKinds.some(x=>typeof x!=='string'||!PROGRAM_KINDS.includes(x as APASProgramKind)))throw new Error('programKinds must match programCount and contain only supported kinds');
 const openRequirements=count(v,'openRequirements'),strictRoutes=count(v,'strictRoutes'),candidateRoutes=count(v,'candidateRoutes'),policyConstraints=count(v,'policyConstraints'),recognizedPolicyRules=count(v,'recognizedPolicyRules'),unclassifiedPolicyConstraints=count(v,'unclassifiedPolicyConstraints'),aggregateContainers=count(v,'aggregateContainers'),unresolved=count(v,'unresolved');
 const transferCourseCount=count(v,'transferCourseCount'),apCreditCount=count(v,'apCreditCount'),ibCreditCount=count(v,'ibCreditCount'),otherTestCreditCount=count(v,'otherTestCreditCount'),nonTestTransferCount=count(v,'nonTestTransferCount'),inProgressCourseCount=count(v,'inProgressCourseCount'),warnings=count(v,'warnings');
 if(strictRoutes+candidateRoutes+policyConstraints+aggregateContainers+unresolved!==openRequirements)throw new Error('Coverage buckets must sum to openRequirements');
 if(recognizedPolicyRules+unclassifiedPolicyConstraints!==policyConstraints)throw new Error('Policy buckets must sum to policyConstraints');
 if(apCreditCount+ibCreditCount+otherTestCreditCount+nonTestTransferCount!==transferCourseCount)throw new Error('Transfer cohorts must sum to transferCourseCount');
 return v as unknown as APASCompatibilityReport;
}
export function compatibilityStructureKey(report:APASCompatibilityReport):string{const{kind:_,schemaVersion:__,generatedAt:___,parserVersion:____,...shape}=report;return JSON.stringify(shape);}
export function parseCompatibilityCorpus(input:unknown):APASCompatibilityCorpus{
 const v=object(input,'Compatibility corpus');exactKeys(v,CORPUS_KEYS,'Compatibility corpus');if(v.kind!==APAS_COMPATIBILITY_CORPUS_KIND)throw new Error('Invalid compatibility corpus kind');if(v.schemaVersion!==APAS_COMPATIBILITY_SCHEMA_VERSION)throw new Error('Unsupported compatibility corpus schema version');if(!Array.isArray(v.reports))throw new Error('Compatibility corpus reports must be an array');
 const reports=v.reports.map(parseCompatibilityReport),seen=new Set<string>();for(const report of reports){const key=compatibilityStructureKey(report);if(seen.has(key))throw new Error(`Duplicate anonymous compatibility structure: ${report.fingerprint}`);seen.add(key);}
 return{kind:APAS_COMPATIBILITY_CORPUS_KIND,schemaVersion:APAS_COMPATIBILITY_SCHEMA_VERSION,reports};
}
export function summarizeCompatibilityCorpus(corpus:APASCompatibilityCorpus):APASCompatibilityCorpusSummary{
 const programKinds=Object.fromEntries(PROGRAM_KINDS.map(k=>[k,0])) as Record<APASProgramKind,number>;for(const r of corpus.reports)for(const k of r.programKinds)programKinds[k]++;
 return{reports:corpus.reports.length,uniqueFingerprints:new Set(corpus.reports.map(r=>r.fingerprint)).size,parserVersions:[...new Set(corpus.reports.map(r=>r.parserVersion))].sort(),programKinds,multiProgramReports:corpus.reports.filter(r=>r.programCount>1).length,apCreditReports:corpus.reports.filter(r=>r.apCreditCount>0).length,ibCreditReports:corpus.reports.filter(r=>r.ibCreditCount>0).length,otherTestCreditReports:corpus.reports.filter(r=>r.otherTestCreditCount>0).length,nonTestTransferReports:corpus.reports.filter(r=>r.nonTestTransferCount>0).length,inProgressReports:corpus.reports.filter(r=>r.inProgressCourseCount>0).length,warningReports:corpus.reports.filter(r=>r.warnings>0).length,unresolvedReports:corpus.reports.filter(r=>r.unresolved>0).length,unclassifiedPolicyReports:corpus.reports.filter(r=>r.unclassifiedPolicyConstraints>0).length};
}
