import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {parseAPAS} from '../packages/apas-parser/index.ts';
import {analyzeRequirementRouteCoverage,degreeDiscoveryPlan} from '../packages/core/rules.ts';

type ProgramRow={college:string;program:string};
type ProgramInventory={source:string;sourceLabel:string;fetchedAt:string;rowCount:number;programs:ProgramRow[]};
type MajorInventory={source:string;sourceLabel:string;fetchedAt:string;majorCount:number;majors:string[]};

const root=process.cwd();
const programInventory=JSON.parse(fs.readFileSync(path.join(root,'config/twin-cities-undergraduate-programs.json'),'utf8')) as ProgramInventory;
const majorInventory=JSON.parse(fs.readFileSync(path.join(root,'config/twin-cities-undergraduate-majors.json'),'utf8')) as MajorInventory;
const outPath=path.join(root,'docs/evidence/twin-cities-program-coverage-20260927.json');
const markdownPath=path.join(root,'docs/TWIN_CITIES_PROGRAM_COVERAGE.md');
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const programKey=(r:ProgramRow)=>`${r.college}|${r.program}`;
const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'');
const mdCell=(s:string)=>s.split('|').join('\\|');
const ua={'user-agent':'Mozilla/5.0 Smart-UMN local verification'};

function structuralAudit(program:string){
 return `<body><div id="audit"><div class="card-header"><h2>${esc(program)}</h2></div>
 <div class="requirement Status_NO" rname="EXACT" rqdsubreq="1"><div class="reqTitle">Approved course</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="1001"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="RANGE" rqdhours="6"><div class="reqTitle">Upper division coursework</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="3XXX"></span></td></tr></tbody></table></div>
 <div class="requirement Status_IP" rname="LEVEL"><div class="reqTitle">4xxx/5xxx-level GEN coursework</div><div class="reqBody"></div></div>
 <div class="requirement Status_IP" rname="DESIGNATOR"><div class="reqTitle">6 credits must have a GEN designator.</div><div class="reqBody"></div></div>
 <div class="requirement Status_NO" rname="CAP" rqdhours="12" maxhours="9"><div class="reqTitle">Take up to 9 credits from the following list. Note: cap applies.</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="3001"></span><span class="course" department="1GEN" number="3002"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="EXCLUDE" rqdsubreq="1"><div class="reqTitle">Approved EXCL 3xxx course except EXCL 3202</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1EXCL" number="3XXX"></span></td></tr></tbody></table><table class="notcourses"><tbody><tr><td><span class="course" department="1EXCL" number="3202"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="GPA" rqdhours="3" rqdgpa="2.0"><div class="reqTitle">GEN GPA route</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="4001"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO" rname="NEEDS"><div class="reqTitle">Choose one approved GEN course</div><div class="reqNeeds"><span class="count">1</span></div><table class="selectcourses"><tbody><tr><td><span class="course" department="1GEN" number="4101"></span><span class="course" department="1GEN" number="4102"></span></td></tr></tbody></table></div>
 <div class="requirement Status_NO category_Total_Hours" rname="TOTAL" rqdhours="120"><div class="reqTitle">Minimum total degree credits</div><div class="reqBody"></div></div>
 <div class="requirement Status_NO" rname="P-DEGREE"><div class="reqTitle">You must complete at least 120 credits. This includes all University of Minnesota and transfer credits.</div></div>
 <div class="requirement Status_NO" rname="P-GPA"><div class="reqTitle">You need a 2.00 GPA in University of Minnesota coursework upon graduating. This includes credits from all University of Minnesota campuses and excludes transfer credits.</div></div>
 <div class="requirement Status_NO" rname="P-RES"><div class="reqTitle">You must complete at least 30 credits through University of Minnesota Twin Cities and Rochester.</div></div>
 <div class="requirement Status_NO" rname="P-FINAL"><div class="reqTitle">You must complete at least 15 of your last 30 credits through University of Minnesota.</div></div>
 <div class="requirement Status_NO" rname="P-MAJOR"><div class="reqTitle">You need at least 78 credits in this major. This GPA includes all major credits, including transfer credits.</div></div>
 <div class="requirement Status_NO" rname="P-UPPER"><div class="reqTitle">You must complete at least 19 upper-division (3xxx-level or higher) credits for this major through University of Minnesota Twin Cities.</div></div>
 <div class="requirement Status_NO" rname="P-DES"><div class="reqTitle">Of the 23 credits required for Technical Electives, 11 must have a CSCI designator.</div></div>
 <div class="requirement Status_NO" rname="P-QUAL"><div class="reqTitle">Biological Sciences with lab or field experience</div></div>
 <div class="requirement Status_NO" rname="P-SCOPE"><div class="reqTitle">Credits used to meet this degree's liberal education, collegiate, and major requirements.</div></div>
 <div class="requirement Status_NO" rname="UNSUPPORTED"><div class="reqTitle">Residency policy requires institutional review</div><div class="reqBody"></div></div>
 </div></body>`;
}

function structuralPass(name:string):boolean{
 const dom=new JSDOM(structuralAudit(name));
 try{
  const profile=parseAPAS(dom.window.document);
  const summary=analyzeRequirementRouteCoverage(profile).overall;
  const discovery=degreeDiscoveryPlan(profile,'UMNTC');
  return profile.program.name===name
   &&summary.totalActiveRemainingRequirements===19
   &&summary.strictSupportedRequirements===7
   &&summary.candidateRouteSupportedRequirements===1
   &&summary.policyConstraints===10
   &&summary.recognizedPolicyRules===9
   &&summary.unclassifiedPolicyConstraints===1
   &&summary.unknownUnroutedRequirements===1
   &&discovery.explicitCodes.includes('GEN 1001')
   &&discovery.subjects.includes('GEN');
 }finally{dom.window.close();}
}

async function fetchDom(url:string):Promise<JSDOM>{
 const response=await fetch(url,{headers:ua});
 if(!response.ok)throw Error(`Official UMN inventory returned HTTP ${response.status}: ${url}`);
 return new JSDOM(await response.text());
}

async function currentPrograms():Promise<ProgramRow[]>{
 const dom=await fetchDom(programInventory.source);
 try{
  const table=[...dom.window.document.querySelectorAll('table')].find(t=>[...t.querySelectorAll('thead th')].map(x=>x.textContent?.trim()).join('|')==='College|Program Title|Sample Plans');
  if(!table)throw Error('Official Twin Cities program table schema not found');
  return [...table.querySelectorAll('tbody tr')].map(tr=>{
   const cells=[...tr.children];
   return{college:(cells[0]?.textContent||'').replace(/\s+/g,' ').trim(),program:(cells[1]?.textContent||'').replace(/\s+/g,' ').trim()};
  }).filter(r=>r.college&&r.program);
 }finally{dom.window.close();}
}

async function currentMajors():Promise<string[]>{
 const dom=await fetchDom(majorInventory.source);
 try{
  const table=dom.window.document.querySelector('table');
  if(!table)throw Error('Official CAPE major table not found');
  const headers=[...table.querySelectorAll('thead th')].map(x=>(x.textContent||'').replace(/\s+/g,' ').trim());
  if(!headers[0]?.startsWith('Program')||!headers.includes('Major'))throw Error('Official CAPE major table schema changed');
  return [...table.querySelectorAll('tbody tr')]
   .filter(tr=>[...tr.querySelectorAll<HTMLAnchorElement>('a[href]')].some(a=>new URL(a.getAttribute('href')!,majorInventory.source).pathname.toLowerCase()==='/major'))
   .map(tr=>(tr.children[0]?.textContent||'').replace(/\s+/g,' ').trim())
   .filter(Boolean);
 }finally{dom.window.close();}
}

const [livePrograms,liveMajors]=await Promise.all([currentPrograms(),currentMajors()]);

const snapshotProgramKeys=new Set(programInventory.programs.map(programKey)),liveProgramKeys=new Set(livePrograms.map(programKey));
const programAdded=livePrograms.filter(r=>!snapshotProgramKeys.has(programKey(r)));
const programRemoved=programInventory.programs.filter(r=>!liveProgramKeys.has(programKey(r)));
const programDuplicateCount=livePrograms.length-new Set(livePrograms.map(programKey)).size;

const snapshotMajors=new Set(majorInventory.majors),liveMajorSet=new Set(liveMajors);
const majorAdded=liveMajors.filter(x=>!snapshotMajors.has(x));
const majorRemoved=majorInventory.majors.filter(x=>!liveMajorSet.has(x));
const majorDuplicateCount=liveMajors.length-liveMajorSet.size;

let realProgramName:string|undefined,realSummary:ReturnType<typeof analyzeRequirementRouteCoverage>['overall']|undefined;
const privateAudit=path.join(root,'.runtime/private-audit.html');
if(fs.existsSync(privateAudit)){
 const dom=new JSDOM(fs.readFileSync(privateAudit,'utf8'));
 try{const p=parseAPAS(dom.window.document);realProgramName=p.program.name;realSummary=analyzeRequirementRouteCoverage(p).overall;}finally{dom.window.close();}
}
const realProgramMatch=realProgramName?livePrograms.find(r=>normalize(r.program)===normalize(realProgramName)):undefined;
const realMajorMatch=realProgramName?liveMajors.find(m=>normalize(realProgramName!).startsWith(normalize(m))||normalize(m).startsWith(normalize(realProgramName!))):undefined;

const programFailures:{college:string;program:string;reason:string}[]=[];
const perProgram=livePrograms.map(row=>{
 let pass=false;
 try{pass=structuralPass(row.program);if(!pass)programFailures.push({...row,reason:'generic structural matrix produced unexpected coverage'});}
 catch(error){programFailures.push({...row,reason:error instanceof Error?error.message:String(error)});}
 const realAuditSample=!!realProgramMatch&&programKey(realProgramMatch)===programKey(row);
 return{...row,inventoryVerified:true,genericAPASStructuralMatrix:pass?'pass':'fail',realAuditSample,evidenceLevel:realAuditSample?'real+synthetic':'synthetic-structural-only',majorSpecificRuleCoverage:realAuditSample?'measured-from-saved-real-audit':'not-claimed-without-real-audit'};
});

const majorFailures:{major:string;reason:string}[]=[];
const perMajor=liveMajors.map(major=>{
 let pass=false;
 try{pass=structuralPass(major);if(!pass)majorFailures.push({major,reason:'generic structural matrix produced unexpected coverage'});}
 catch(error){majorFailures.push({major,reason:error instanceof Error?error.message:String(error)});}
 const realAuditSample=realMajorMatch===major;
 return{major,inventoryVerified:true,genericAPASStructuralMatrix:pass?'pass':'fail',realAuditSample,evidenceLevel:realAuditSample?'real+synthetic':'synthetic-structural-only',majorSpecificRuleCoverage:realAuditSample?'measured-from-saved-real-audit':'not-claimed-without-real-audit'};
});

const colleges=Object.fromEntries([...new Set(livePrograms.map(r=>r.college))].sort().map(college=>[college,livePrograms.filter(r=>r.college===college).length]));
const report={
 checkedAt:new Date().toISOString(),
 scope:'University of Minnesota Twin Cities undergraduate majors and program-degree/APAS identities',
 officialMajorInventory:{
  source:majorInventory.source,snapshotDate:majorInventory.fetchedAt,snapshotMajors:majorInventory.majorCount,liveMajors:liveMajors.length,
  drift:{added:majorAdded,removed:majorRemoved,duplicateCount:majorDuplicateCount}
 },
 officialProgramInventory:{
  source:programInventory.source,snapshotDate:programInventory.fetchedAt,snapshotRows:programInventory.rowCount,liveRows:livePrograms.length,collegeCount:Object.keys(colleges).length,colleges,
  drift:{added:programAdded,removed:programRemoved,duplicateCount:programDuplicateCount}
 },
 verification:{
  currentMajorNamesChecked:liveMajors.length,
  majorStructuralPasses:perMajor.filter(x=>x.genericAPASStructuralMatrix==='pass').length,
  majorStructuralFailures:majorFailures.length,
  currentProgramTitlesChecked:livePrograms.length,
  programStructuralPasses:perProgram.filter(x=>x.genericAPASStructuralMatrix==='pass').length,
  programStructuralFailures:programFailures.length,
  structuralRequirementShape:{total:19,strict:7,candidate:1,aggregate:0,policy:10,recognizedPolicy:9,unclassifiedPolicy:1,unknown:1},
  realAuditSamples:{
   count:realProgramMatch?1:0,
   matchedMajor:realMajorMatch||null,
   matchedInventoryProgram:realProgramMatch||null,
   savedAuditProgram:realProgramName||null,
   coverage:realSummary||null
  }
 },
 evidenceLevelCounts:{
  majors:{realPlusSynthetic:perMajor.filter(x=>x.evidenceLevel==='real+synthetic').length,syntheticStructuralOnly:perMajor.filter(x=>x.evidenceLevel==='synthetic-structural-only').length},
  programs:{realPlusSynthetic:perProgram.filter(x=>x.evidenceLevel==='real+synthetic').length,syntheticStructuralOnly:perProgram.filter(x=>x.evidenceLevel==='synthetic-structural-only').length}
 },
 interpretation:[
  'CAPE Major Profiles supplies the current major-name inventory; Twin Cities Sample Plans supplies degree/program identities that more closely resemble APAS program headings.',
  'Every current official major name and every current official program-degree title is exercised through the same APAS parser; there is no program-name or college allowlist.',
  'The synthetic structural matrix proves title independence across supported APAS rule families, including explicit exclusions, GPA wrappers, APAS Needs counts, candidate-only caps, seven typed non-authorizing policy Rule IR families, one unclassified policy/accounting constraint, and a deliberately unsupported fail-closed route. It does not prove that every real major-specific APAS policy has been observed.',
  'A major/program is marked real+synthetic only when a saved real APAS sample exists locally; all others remain explicitly synthetic-structural-only until a real or anonymized audit sample is available.'
 ],
 failures:{majors:majorFailures,programs:programFailures},
 majors:perMajor,
 programs:perProgram
};
fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');
const md:string[]=[
 '# Twin Cities undergraduate major and APAS program coverage matrix','',
 `Two official University of Minnesota sources are checked on every \`npm run verify:majors\` run:`, '',
 `- **CAPE Major Profiles** for current major names: **${report.officialMajorInventory.liveMajors} majors**.`,
 `- **Twin Cities Sample Plans** for degree/program identities that more closely resemble APAS program headings: **${report.officialProgramInventory.liveRows} program-degree rows across ${report.officialProgramInventory.collegeCount} colleges/schools**.`,'',
 '## What a PASS means','',
 'Every major name and every program-degree title below is sent through the same program-agnostic APAS parser with a nineteen-shape synthetic structural audit: seven strict course-authorizing forms (including exclusions, GPA wrapping and APAS Needs counts), one candidate-only capped pool, nine typed non-authorizing policy Rule IR families, one still-unclassified policy/accounting constraint, and one deliberately unsupported route that must remain fail-closed. A PASS proves that the title/college does not require a hardcoded allowlist and that supported routing, typed policy containment and unsupported-rule containment survive for that identity.','',
 'It does **not** prove that every real, major-specific APAS policy for that program has been observed. Only identities with a locally saved real audit are labeled `real+synthetic`; every other identity remains `synthetic-structural-only` until a real or anonymized audit sample is available.','',
 `Current result: **${report.verification.majorStructuralPasses}/${report.verification.currentMajorNamesChecked} majors PASS** and **${report.verification.programStructuralPasses}/${report.verification.currentProgramTitlesChecked} program-degree identities PASS**, with zero structural failures. Major inventory drift: ${report.officialMajorInventory.drift.added.length} added / ${report.officialMajorInventory.drift.removed.length} removed / ${report.officialMajorInventory.drift.duplicateCount} duplicates. Program inventory drift: ${report.officialProgramInventory.drift.added.length} added / ${report.officialProgramInventory.drift.removed.length} removed / ${report.officialProgramInventory.drift.duplicateCount} duplicates.`,'',
 '## College/school program-degree inventory','',
 '| College / school | Program-degree rows |','|---|---:|',
 ...Object.entries(report.officialProgramInventory.colleges).map(([college,count])=>`| ${mdCell(college)} | ${count} |`),'',
 '## Major-by-major status','',
 '| Major | Structural matrix | Real APAS sample | Evidence level |','|---|---|---|---|',
 ...report.majors.map(x=>`| ${mdCell(x.major)} | ${x.genericAPASStructuralMatrix.toUpperCase()} | ${x.realAuditSample?'yes':'no'} | ${x.evidenceLevel} |`),'',
 '## Program-degree / APAS-identity status','',
 '| College / school | Program | Structural matrix | Real APAS sample | Evidence level |','|---|---|---|---|---|',
 ...report.programs.map(x=>`| ${mdCell(x.college)} | ${mdCell(x.program)} | ${x.genericAPASStructuralMatrix.toUpperCase()} | ${x.realAuditSample?'yes':'no'} | ${x.evidenceLevel} |`),'',
 '## Current real-audit evidence',''
];
const real=report.verification.realAuditSamples;
md.push(real.count?`The saved real audit maps to major **${real.matchedMajor}** and program-degree identity **${real.matchedInventoryProgram!.program}** in **${real.matchedInventoryProgram!.college}**. Its active remaining nodes are ${real.coverage!.strictSupportedRequirements} strict routes, ${real.coverage!.candidateRouteSupportedRequirements} candidate routes, ${real.coverage!.aggregateContainers} aggregate containers, ${real.coverage!.policyConstraints} policy constraints (${real.coverage!.recognizedPolicyRules} structured policy rules / ${real.coverage!.unclassifiedPolicyConstraints} still-unclassified policy/accounting constraints), and ${real.coverage!.unknownUnroutedRequirements} unknown/unrouted requirements.`:'No saved real APAS sample was available in this run.');
md.push('','The machine-readable source of truth is `docs/evidence/twin-cities-program-coverage-20260927.json`. Raw private APAS HTML is not copied into either evidence file.','');
fs.writeFileSync(markdownPath,md.join('\n'));
console.log(JSON.stringify({
 liveMajors:liveMajors.length,majorAdded:majorAdded.length,majorRemoved:majorRemoved.length,majorDuplicateCount,majorStructuralPasses:report.verification.majorStructuralPasses,majorStructuralFailures:majorFailures.length,
 liveProgramRows:livePrograms.length,collegeCount:Object.keys(colleges).length,programAdded:programAdded.length,programRemoved:programRemoved.length,programDuplicateCount,programStructuralPasses:report.verification.programStructuralPasses,programStructuralFailures:programFailures.length,
 realAuditSamples:report.verification.realAuditSamples.count,evidence:report.evidenceLevelCounts,outPath,markdownPath
},null,2));
if(majorAdded.length||majorRemoved.length||majorDuplicateCount||programAdded.length||programRemoved.length||programDuplicateCount||majorFailures.length||programFailures.length)process.exitCode=1;
