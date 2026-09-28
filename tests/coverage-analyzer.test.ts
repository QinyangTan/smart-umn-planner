import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeRequirementRouteCoverage,requirementRouteCoverage} from '../packages/core/rules.ts';
import type {AcademicProgramRoute,DegreeRequirement,RequirementRule,StudentAcademicProfile} from '../packages/schemas/index.ts';

const now='2026-09-27T09:35:00.000Z';
const provenance={source:'synthetic-fixture',retrievedAt:now,period:'synthetic'};
function requirement(id:string,label:string,rule:RequirementRule,extra:Partial<DegreeRequirement>={}):DegreeRequirement{
 return{id,label,status:'incomplete',coursesUsed:[],children:[],rule,rawMetadata:{fixture:true},...extra};
}
function additional(name:string,kind:AcademicProgramRoute['program']['kind'],requirements:DegreeRequirement[]):AcademicProgramRoute{
 return{program:{name,kind,campus:'UMNTC'},requirements,syncedAt:now,parserVersion:'test',warnings:[],provenance};
}
function profile():StudentAcademicProfile{
 const primary:DegreeRequirement[]=[
  requirement('psy-core','Psychology core',{type:'course',code:'PSY 3001',campus:'UMNTC'}),
  requirement('psy-elective','Psychology approved elective',{type:'unknown',sourceText:'Choose from approved pool subject to cap',reason:'Cap semantics need review'},{candidateRule:{type:'range',subject:'PSY',min:3000,max:4999,campus:'UMNTC'}}),
  requirement('degree-credits','Degree credits',{type:'unknown',sourceText:'120 total credits',reason:'Policy-only requirement'},{requiredCredits:120,remainingCredits:18}),
  requirement('cla-distribution','CLA distribution',{type:'anyOf',rules:[{type:'course',code:'SOC 1001',campus:'UMNTC'},{type:'unknown',sourceText:'or approved alternative',reason:'Approved alternative is not structurally enumerated'}]}),
  requirement('language','Language proficiency',{type:'allOf',rules:[{type:'course',code:'SPAN 1004',campus:'UMNTC'},{type:'unknown',sourceText:'proficiency condition',reason:'Standing condition'}]}),
  requirement('lib-ed','Social Sciences',{type:'attribute',attribute:'LIBED',value:'SOCS',name:'Social Sciences',campus:'UMNTC'}),
  requirement('exclusion','Research elective excluding PSY 3993',{type:'exclude',rule:{type:'range',subject:'PSY',min:3000,max:4999,campus:'UMNTC'},excluded:[{type:'course',code:'PSY 3993',campus:'UMNTC'}]}),
  requirement('major-gpa','Major GPA',{type:'gpa',minimum:2.5,rule:{type:'range',subject:'PSY',min:3000,max:5999,campus:'UMNTC'}},{requiredGpa:2.5})
 ];
 return{
  program:{name:'Psychology BA',kind:'degree',campus:'UMNTC'},
  degreeCredits:{required:120,completed:90,inProgress:12,remaining:18},
  completedCourses:[],inProgressCourses:[],transferCourses:[],requirements:primary,
  additionalPrograms:[
   additional('History Minor','minor',[requirement('hist-count','History minor electives',{type:'count',minimum:2,rule:{type:'range',subject:'HIST',min:3000,max:5999,campus:'UMNTC'}},{requiredCount:2,remainingCount:2})]),
   additional('Data Science Certificate','certificate',[requirement('dsci-range','Certificate elective',{type:'range',subject:'DSCI',min:3000,max:5999,campus:'UMNTC'})])
  ],
  syncedAt:now,parserVersion:'test',warnings:[],provenance
 };
}

test('coverage analyzer reports strict, candidate, unknown, percentages, rule buckets and unsupported reasons',()=>{
 const analysis=analyzeRequirementRouteCoverage(profile());
 assert.equal(analysis.overall.totalActiveRemainingRequirements,10);
 assert.equal(analysis.overall.strictSupportedRequirements,7);
 assert.equal(analysis.overall.candidateRouteSupportedRequirements,1);
 assert.equal(analysis.overall.unknownUnroutedRequirements,1);
 assert.equal(analysis.overall.policyConstraints,1);
 assert.equal(analysis.overall.recognizedPolicyRules,0);
 assert.equal(analysis.overall.unclassifiedPolicyConstraints,1);
 assert.equal(analysis.overall.strictCoveragePercent,70);
 assert.equal(analysis.overall.usefulRouteCoveragePercent,80);
 assert.deepEqual(analysis.overall.breakdown,{
  exactCourse:1,subjectRange:1,officialAttribute:1,credits:1,count:1,gpa:1,exclusions:1,nested:2,candidateOnly:1,unknown:0
 });
 assert.equal(analysis.overall.unsupportedReasonHistogram['Policy-only requirement'],1);
 assert.equal(analysis.overall.unsupportedReasonHistogram['Standing condition'],1);
 assert.equal(analysis.programs.length,3);
 const primary=analysis.programs.find(p=>p.programName==='Psychology BA')!;
 assert.equal(primary.summary.totalActiveRemainingRequirements,8);
 assert.equal(primary.summary.strictSupportedRequirements,5);
 assert.equal(primary.summary.candidateRouteSupportedRequirements,1);
 assert.equal(primary.summary.unknownUnroutedRequirements,1);
 const minor=analysis.programs.find(p=>p.programName==='History Minor')!;
 assert.equal(minor.programKind,'minor');
 assert.equal(minor.summary.breakdown.count,1);
 const certificate=analysis.programs.find(p=>p.programName==='Data Science Certificate')!;
 assert.equal(certificate.programKind,'certificate');
 assert.equal(certificate.summary.breakdown.subjectRange,1);
});

test('recognized policy Rule IR is separated from legacy unclassified policy accounting',()=>{const p=profile();p.requirements.push(requirement('residency','Residency',{type:'policy',family:'residency-credits',sourceText:'30 credits through UMN Twin Cities',reason:'recognized',parameters:{minimumCredits:30,campuses:['UMNTC']}}));const s=analyzeRequirementRouteCoverage(p).overall;assert.equal(s.policyConstraints,2);assert.equal(s.recognizedPolicyRules,1);assert.equal(s.unclassifiedPolicyConstraints,1);assert.equal(s.unknownUnroutedRequirements,1);});

test('legacy compact route coverage remains compatible with the richer analyzer',()=>{
 assert.deepEqual(requirementRouteCoverage(profile()),{
  openRequirements:10,
  strictRoutes:7,
  candidateRoutes:1,
  policyConstraints:1,
  unresolved:1
 });
});

test('no active remaining requirements yields complete denominator-free coverage',()=>{
 const p=profile();
 for(const requirement of p.requirements)requirement.status='complete';
 for(const program of p.additionalPrograms||[])for(const requirement of program.requirements)requirement.status='complete';
 const analysis=analyzeRequirementRouteCoverage(p);
 assert.equal(analysis.overall.totalActiveRemainingRequirements,0);
 assert.equal(analysis.overall.strictCoveragePercent,100);
 assert.equal(analysis.overall.usefulRouteCoveragePercent,100);
 assert.deepEqual(analysis.overall.unsupportedReasonHistogram,{});
});
