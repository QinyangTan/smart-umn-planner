export type Truth = 'yes' | 'no' | 'unknown';
export type UMNCampus='UMNTC'|'UMNDL'|'UMNCR'|'UMNMO'|'UMNRO';
export type UMNInstitution='UMNTC'|'UMNDL'|'UMNCR'|'UMNMO';
export type CampusContext={campus:UMNCampus;institution:UMNInstitution;name:string};
export const UMN_CAMPUSES:Record<UMNCampus,CampusContext>={UMNTC:{campus:'UMNTC',institution:'UMNTC',name:'Twin Cities'},UMNDL:{campus:'UMNDL',institution:'UMNDL',name:'Duluth'},UMNCR:{campus:'UMNCR',institution:'UMNCR',name:'Crookston'},UMNMO:{campus:'UMNMO',institution:'UMNMO',name:'Morris'},UMNRO:{campus:'UMNRO',institution:'UMNTC',name:'Rochester'}};
export type Provenance = {source:string; url?:string; retrievedAt:string; period:string; sampleSize?:number};
export type ProviderHealth = {source:string; status:'healthy'|'degraded'|'down'; checkedAt:string; message?:string};
export type Evidence<T> = {data:T|null; provenance:Provenance; health:ProviderHealth; stale:boolean};
export type PolicyRuleFamily='degree-credits'|'institutional-gpa'|'residency-credits'|'final-residency-credits'|'major-credits'|'upper-division-major-credits'|'designator-scope'|'qualified-attribute'|'degree-application-scope';
export type PolicyRuleParameter=string|number|boolean|string[];
export const PREREQUISITE_CONDITION_FAMILIES=['consent','standing','program-membership','audition','honors','placement','concurrent-registration','minimum-earned-credits','application-approval'] as const;
export type PrerequisiteConditionFamily=typeof PREREQUISITE_CONDITION_FAMILIES[number];
export type RequirementRule =
 | {type:'unknown'; sourceText:string; reason:string}
 | {type:'policy'; family:PolicyRuleFamily; sourceText:string; reason:string; parameters:Record<string,PolicyRuleParameter>}
 | {type:'condition'; family:PrerequisiteConditionFamily; sourceText:string; parameters:Record<string,PolicyRuleParameter>}
 | {type:'course'; code:string; campus?:UMNCampus; minimumGrade?:string}
 | {type:'range'; subject:string; min:number; max:number; suffix?:string; campus?:UMNCampus}
 | {type:'attribute'; attribute:string; value:string; name?:string; campus?:UMNCampus}
 | {type:'anyOf'|'allOf'; rules:RequirementRule[]}
 | {type:'exclude'; rule:RequirementRule; excluded:RequirementRule[]}
 | {type:'credits'; minimum:number; maximum?:number; rule:RequirementRule}
 | {type:'count'; minimum:number; maximum?:number; rule:RequirementRule}
 | {type:'gpa'; minimum:number; rule:RequirementRule};
export type StudentCourse = {courseCode?:string; campus?:UMNCampus; subject?:string; number?:string; title?:string; credits?:number; term?:string; grade?:string; status:'completed'|'in_progress'|'transfer'|'future'|'unknown'; transferSource?:string};
export type DegreeRequirement = {id:string; code?:string; label:string; status:'complete'|'in_progress'|'incomplete'|'informational'|'unknown'; requiredCredits?:number; appliedCredits?:number; inProgressCredits?:number; remainingCredits?:number; requiredCount?:number; appliedCount?:number; inProgressCount?:number; remainingCount?:number; requiredGpa?:number; coursesUsed:string[]; children:DegreeRequirement[]; rule:RequirementRule; candidateRule?:RequirementRule; rawMetadata:Record<string,unknown>};
export type AcademicProgram={name:string; catalogYear?:string; expectedGraduation?:string; campus?:UMNCampus; kind?:'degree'|'major'|'minor'|'certificate'|'what_if'|'unknown'};
export type AcademicProgramRoute={program:AcademicProgram;requirements:DegreeRequirement[];syncedAt:string;parserVersion:string;warnings:string[];provenance:Provenance};
export type StudentAcademicProfile = {schemaVersion?:1; program:AcademicProgram; degreeCredits:{required?:number; completed?:number; inProgress?:number; remaining?:number}; completedCourses:StudentCourse[]; inProgressCourses:StudentCourse[]; transferCourses:StudentCourse[]; requirements:DegreeRequirement[]; additionalPrograms?:AcademicProgramRoute[]; syncedAt:string; parserVersion:string; warnings:string[]; provenance:Provenance};
export type Course = {institution:UMNInstitution; campus:UMNCampus; term:string; subject:string; catalogNumber:string; code:string; title:string; description:string; credits?:number|number[]; prerequisites:string; prerequisiteRule:RequirementRule; attributes:string[]; sectionIds:string[]; equivalents:string[]; sourceRefs:Record<string,string>; provenance:Provenance};
export type Meeting = {days:string[]; startTime?:string; endTime?:string; startDate?:string; endDate?:string; location?:string};
export type Instructor = {id:string; name:string; internetId?:string; aliases:string[]};
export type Section = {classNumber:string; sectionNumber:string; courseCode:string; institution?:UMNInstitution; campus?:UMNCampus; term:string; component:string; credits?:number; instructors:Instructor[]; meetings:Meeting[]; capacity?:number; enrolled?:number; waitlistCapacity?:number; waitlistTotal?:number; open?:boolean; enrollable?:boolean; instructionMode:string; restrictions:unknown[]; prerequisiteRule:RequirementRule; linkedClassNumbers:string[]; unresolvedLinks:boolean; scheduleKnown:boolean; provenance:Provenance};
export type InstructorRating = {instructorName:string;professorId:number;quality:number;via:'gophergrades';source:'ratemyprofessors'};
export type GradeEvidence = {instructorRatings?:InstructorRating[];courseCode:string; totalStudents:number; grades:Record<string,number>; distributions:{instructorName?:string; term:string; students:number; grades:Record<string,number>}[]};
export type CommunityReference = {id:string; source:'reddit'|'ratemyprofessor'|'forum'|'other'; entityType:'course'|'instructor'; entityId:string; title:string; url:string; publishedAt?:string; excerpt?:string; topics:string[]; sourceDocumentId?:string; discoveredAt:string; provenance:Provenance};
export type CourseContext = {course:Evidence<Course>; sections:Evidence<Section[]>; grades:Evidence<GradeEvidence>; feedback:Evidence<unknown>; community:CommunityReference[]};
export type GeneralEducationRequirement={attribute:string;value:string;token:string;name:string};
export type GeneralEducationCatalog={campus:UMNCampus;institution:UMNInstitution;term:string;name:string;requirements:GeneralEducationRequirement[];provenance:Provenance};
export type PlanningGoal='progress'|'lightLoad'|'gradeHistory';
export type Preferences = {minCredits:number; maxCredits:number; planningGoal?:PlanningGoal; earliestTime?:string; latestTime?:string; noFriday?:boolean; preferOnline?:boolean; fewestDays?:boolean; preferredInstructors?:string[]; minimumTransitionMinutes?:number; allowWaitlist?:boolean; maxCampusDays?:number};
export type RequirementAllocation = {requirementId:string; label:string; unit:'credits'|'courses'; target:number; applied:number; remaining:number; courseCodes:string[]; gradeSensitive:boolean};
export type DegreeProgressSummary = {allocations:RequirementAllocation[]; unallocatedCourseCodes:string[]; fullyCoveredTargets:number; totalTargets:number; coverageScore:number; allocatedCredits:number};
export type Schedule = {id:string; sections:Section[]; courses:Course[]; credits:number; campusDays:number; explanations:string[]; degreeProgress?:DegreeProgressSummary};
export interface DataProvider<T> {healthCheck():Promise<ProviderHealth>; fetch(...args:string[]):Promise<Evidence<T>>; normalize(raw:unknown,...args:string[]):T; validate(raw:unknown):boolean;}
export interface DegreeAuditProvider {parse(document:Document,history?:Document):StudentAcademicProfile;}
export type CourseCatalogProvider=DataProvider<Course>;
export type SectionProvider=DataProvider<Section[]>;
export type GradeEvidenceProvider=DataProvider<GradeEvidence>;
export type CourseFeedbackProvider=DataProvider<unknown>;
export interface CommunityReferenceProvider {get(entityId:string):CommunityReference[];}
export function campusCode(value:string):UMNCampus {const s=value.trim().toUpperCase();if(!(s in UMN_CAMPUSES))throw new Error('Invalid UMN campus');return s as UMNCampus;}
export function campusContext(value:string):CampusContext {return UMN_CAMPUSES[campusCode(value)];}
export const APAS_CAMPUS_DIGITS:Record<string,UMNCampus>={'1':'UMNTC','3':'UMNDL','4':'UMNMO','5':'UMNCR','6':'UMNRO'};
export function subjectCode(value:string):string { const s=value.trim().toUpperCase(); if(!/^[A-Z]{2,8}$/.test(s))throw new Error('Expected a UMN subject such as PSY'); return s; }
export function parseCampusCourseCode(value:string):{code:string;campus?:UMNCampus;subject:string;catalogNumber:string}{const m=/^\s*([13456])?([A-Z]{2,8})\s*(\d{1,4}[A-Z]?)\s*$/i.exec(value);if(!m)throw new Error('Expected a UMN course code such as PSY 1001');const subject=m[2].toUpperCase(),catalogNumber=m[3].toUpperCase();return{code:`${subject} ${catalogNumber}`,campus:m[1]?APAS_CAMPUS_DIGITS[m[1]]:undefined,subject,catalogNumber};}
export function courseCode(value:string):string {return parseCampusCourseCode(value).code;}
export function instructorEntityKey(name:string,campus?:UMNCampus):string { const clean=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' '); if(!clean||clean.length>160)throw new Error('Invalid instructor name'); return campus&&campus!=='UMNTC'?`instructor:${campus}:${clean}`:`instructor:${clean}`; }
export function courseEntityKey(code:string,campus?:UMNCampus):string {const c=courseCode(code);return campus&&campus!=='UMNTC'?`course:${campus}:${c}`:c;}
export function termCode(value:string):string {if(!/^1\d{2}[359]$/.test(value))throw new Error('Invalid UMN term'); return value;}
export function finite(value:unknown):number|undefined {if(value===null||value===undefined||value==='')return; const n=Number(value);return Number.isFinite(n)?n:undefined;}
export function record(value:unknown):Record<string,any> {if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid provider object');return value as Record<string,any>;}
export function unknownRule(sourceText:string,reason='Unsupported or incomplete rule'):RequirementRule {return {type:'unknown',sourceText,reason};}
