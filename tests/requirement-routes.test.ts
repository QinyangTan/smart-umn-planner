import{test}from'node:test';
import assert from'node:assert/strict';
import{JSDOM}from'jsdom';
import{asAdditionalProgram,discoverAuditChoices,mergeProgramAudit,parseAPAS}from'../packages/apas-parser/index.ts';
import{degreeCandidateFit,degreeDiscoveryPlan,degreeFit,flattenRequirements}from'../packages/core/rules.ts';
import type{Course}from'../packages/schemas/index.ts';

const now='2026-09-27T04:00:00.000Z';
function course(code:string):Course{const[subject,catalogNumber]=code.split(' ');return{institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,title:code,description:'fixture',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf',rules:[]},attributes:[],sectionIds:['1'],equivalents:[],sourceRefs:{},provenance:{source:'fixture',retrievedAt:now,period:'1273'}};}

test('explicit APAS pool remains discoverable when cap semantics are intentionally not promoted',()=>{
 const html=['<body><div id="audit"><div class="card-header"><h2>Example BA</h2></div>',
 '<div class="requirement Status_NO" rname="ELEC" rqdhours="12"><div class="reqTitle">Program Electives</div><div class="reqBody"><div class="auditSubrequirements">',
 '<div class="subrequirement" pseudo="POOL" rqdsubreq="0" rqdhours="0" maxhours="9"><div class="subreqPretext"><span class="status Status_NONE"></span></div><div class="subreqBody">',
 '<span class="subreqTitle">Take up to 9 credits from the following list. Note: cap applies.</span>',
 '<table class="selectcourses"><tbody><tr><td><span class="course" department="1PSY" number="3001"></span><span class="course" department="1PSY" number="3002"></span></td></tr></tbody></table>',
 '</div></div></div></div></div></div></body>'].join('');
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document),req=p.requirements[0],c=course('PSY 3001');
 assert.equal(req.rule.type,'unknown','compound cap must remain non-authorizing');
 assert.ok(req.candidateRule,'parent inherits a structural candidate route from its child pool');
 assert.equal(degreeFit(c,p).some(x=>x.result==='yes'),false);
 assert.equal(degreeCandidateFit(c,p).some(x=>x.result==='yes'&&!x.strict),true);
 dom.window.close();
});

test('structured APAS notcourses exclusion remains strict even when the label says except',()=>{
 const html='<body><div id="audit"><div class="card-header"><h2>Example Degree</h2></div><div class="requirement Status_NO" rname="EX" rqdsubreq="1"><div class="reqTitle">One EXCL 3xxx course except EXCL 3202</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1EXCL" number="3XXX"></span></td></tr></tbody></table><table class="notcourses"><tbody><tr><td><span class="course" department="1EXCL" number="3202"></span></td></tr></tbody></table></div></div></body>';
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document),req=p.requirements[0];
 assert.equal(req.rule.type,'count');
 assert.equal(degreeFit(course('EXCL 3201'),p).some(x=>x.requirementId===req.id&&x.result==='yes'),true);
 assert.equal(degreeFit(course('EXCL 3202'),p).some(x=>x.requirementId===req.id&&x.result==='yes'),false);
 assert.equal(degreeCandidateFit(course('EXCL 3202'),p).some(x=>x.requirementId===req.id&&x.result==='yes'),false);
 dom.window.close();
});

test('APAS Needs count creates a strict count rule for an explicit selectable route',()=>{
 const html=['<body><div id="audit"><div class="card-header"><h2>Example Minor</h2></div>',
 '<div class="requirement Status_NO" rname="MINOR"><div class="reqTitle">Minor Requirements</div><div class="reqBody"><div class="auditSubrequirements">',
 '<div class="subrequirement" pseudo="REQ1" rqdsubreq="1" rqdhours="0"><div class="subreqPretext"><span class="status Status_NO"></span></div><div class="subreqBody">',
 '<span class="subreqTitle">Choose one approved course</span><table class="subreqNeeds"><tbody><tr><td class="count number">1</td></tr></tbody></table>',
 '<table class="selectcourses"><tbody><tr><td><span class="course" department="1HIST" number="3001"></span><span class="course" department="1HIST" number="3002"></span></td></tr></tbody></table>',
 '</div></div></div></div></div></div></body>'].join('');
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document),sub=p.requirements[0].children[0];
 assert.equal(sub.rule.type,'count');assert.equal(sub.requiredCount,1);assert.equal(sub.remainingCount,1);
 assert.equal(degreeFit(course('HIST 3001'),p).some(x=>x.result==='yes'),true);
 dom.window.close();
});

test('an imported minor contributes APAS routes without replacing the primary degree profile',()=>{
 const primaryDom=new JSDOM('<body><div id="audit"><div class="card-header"><h2>Psychology BA</h2></div><div class="requirement Status_NO" rname="MAJOR" rqdsubreq="1"><div class="reqTitle">Major choice</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1PSY" number="3001"></span></td></tr></tbody></table></div></div></body>');
 const minorDom=new JSDOM('<body><div id="audit"><div class="card-header"><h2>History Minor</h2></div><div class="requirement Status_NO" rname="MINOR" rqdsubreq="1"><div class="reqTitle">Minor choice</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1HIST" number="3001"></span></td></tr></tbody></table></div></div></body>');
 const primary=parseAPAS(primaryDom.window.document),minor=parseAPAS(minorDom.window.document);primary.additionalPrograms=[asAdditionalProgram(minor)];
 assert.equal(primary.program.kind,'degree');assert.equal(minor.program.kind,'minor');assert.equal(degreeFit(course('HIST 3001'),primary).some(x=>x.result==='yes'&&x.label.includes('History Minor')),true);assert.ok(degreeDiscoveryPlan(primary,'UMNTC').explicitCodes.includes('HIST 3001'));
 primaryDom.window.close();minorDom.window.close();
});

test('primary degree can retain a second major, minor, and certificate without duplicate program routes',()=>{
 const mk=(name:string,subject:string,number:string)=>{const dom=new JSDOM(`<body><div id="audit"><div class="card-header"><h2>${name}</h2></div><div class="requirement Status_NO" rname="R" rqdsubreq="1"><div class="reqTitle">${name} choice</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1${subject}" number="${number}"></span></td></tr></tbody></table></div></div></body>`);const p=parseAPAS(dom.window.document);dom.window.close();return p;};
 const primary=mk('Psychology BA','PSY','3001'),second=mk('Statistics Major','STAT','3021'),minor=mk('History Minor','HIST','3001'),certificate=mk('Data Science Certificate','DSCI','3001');let merged=mergeProgramAudit(undefined,primary);merged=mergeProgramAudit(merged,second);merged=mergeProgramAudit(merged,minor);merged=mergeProgramAudit(merged,certificate);merged=mergeProgramAudit(merged,minor);
 assert.equal(merged.program.name,'Psychology BA');assert.deepEqual(merged.additionalPrograms?.map(p=>p.program.name),['Statistics Major','History Minor','Data Science Certificate']);for(const code of ['STAT 3021','HIST 3001','DSCI 3001'])assert.equal(degreeFit(course(code),merged).some(x=>x.result==='yes'),true,code);
});

test('completed APAS audit choices keep only the newest audit per program title',()=>{
 const html='<body><table><thead><tr><th>Title</th><th>Created</th><th>Action</th></tr></thead><tbody><tr><td>Psychology BA</td><td>09/20/2026 10:00 AM</td><td><a href="/selfservice/audit/read.html?id=old">View APAS</a></td></tr><tr><td>Psychology BA</td><td>09/26/2026 10:00 AM</td><td><a href="/selfservice/audit/read.html?id=new">View APAS</a></td></tr><tr><td>History Minor</td><td>09/26/2026 10:01 AM</td><td><a href="/selfservice/audit/read.html?id=minor">View APAS</a></td></tr></tbody></table></body>';
 const dom=new JSDOM(html,{url:'https://umn.uachieve.com/selfservice/audit/list.html'}),choices=discoverAuditChoices(dom.window.document,dom.window.location.href);assert.deepEqual(choices.map(x=>x.title),['Psychology BA','History Minor']);assert.match(choices.find(x=>x.title==='Psychology BA')!.href,/id=new/);dom.window.close();
});

test('degree totals are discovered from APAS semantic category without a program-specific code',()=>{
 const html='<body><div id="audit"><div class="card-header"><h2>Strategic Communication</h2></div><div class="requirement Status_NO category_Total_Hours" rname="ANYCODE" rqdhours="120"><div class="reqTitle">Program credit minimum</div><div class="reqEarned"><span class="hours">75</span></div><div class="reqIpDetail"><span class="hours">12</span></div><div class="reqNeeds"><span class="hours">33</span></div></div></div></body>';
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document);assert.equal(p.program.kind,'degree');assert.deepEqual(p.degreeCredits,{required:120,completed:75,inProgress:12,remaining:33});dom.window.close();
});

test('an unfamiliar Twin Cities degree title remains importable instead of depending on an abbreviation allowlist',()=>{
 const html='<body><div id="audit"><div class="card-header"><h2>Landscape Architecture BLA</h2></div><div class="requirement Status_NO" rname="R" rqdhours="3"><div class="reqTitle">Studio</div><div class="selectcourses"><span class="course" department="1LA" number="3001"></span></div></div></div></body>';
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document);assert.equal(p.program.kind,'degree');assert.equal(p.program.name,'Landscape Architecture BLA');dom.window.close();
});

test('standalone APAS designator-credit prose becomes a generic subject route',()=>{
 const html='<body><div id="audit"><div class="card-header"><h2>Example Degree</h2></div><div class="requirement Status_IP" rname="DES"><div class="reqTitle">11 credits must have a JOUR designator.</div><div class="reqBody"></div></div></div></body>';
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document),r=flattenRequirements(p.requirements)[0];assert.equal(r.rule.type,'credits');assert.equal(degreeFit(course('JOUR 3004'),p).some(x=>x.result==='yes'),true);assert.equal(degreeFit(course('PSY 3004'),p).some(x=>x.result==='yes'),false);dom.window.close();
});

test('designator credit scoped to another requirement never independently authorizes arbitrary subject courses',()=>{
 const html='<body><div id="audit"><div class="card-header"><h2>Example Degree</h2></div><div class="requirement Status_IP" rname="DES" rqdhours="11"><div class="reqTitle">Of the 23 credits required for the Technical Electives and Math Requirement, 11 must have a CSCI designator.</div><div class="reqBody"></div></div></div></body>';
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document),r=flattenRequirements(p.requirements)[0];assert.equal(r.rule.type,'unknown');assert.match(r.rule.type==='unknown'?r.rule.reason:'',/scoped to another requirement/);assert.equal(r.candidateRule,undefined);assert.equal(degreeFit(course('CSCI 1113'),p).some(x=>x.result==='yes'),false);assert.equal(degreeCandidateFit(course('CSCI 1113'),p).some(x=>x.result==='yes'),false);dom.window.close();
});

test('designator credits needed to fulfill a parent requirement stay non-authorizing',()=>{
 const html='<body><div id="audit"><div class="card-header"><h2>Example Degree</h2></div><div class="requirement Status_NO" rname="TECH"><div class="reqTitle">Technical Electives</div><div class="subrequirement Status_IP" rqdhours="11"><div class="subreqTitle">Of the 23 credits needed to fulfill this requirement 11 must have a CSCI designator.</div></div></div></div></body>';
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document),all=flattenRequirements(p.requirements),child=all.find(x=>/needed to fulfill/.test(x.label))!;assert.equal(child.rule.type,'unknown');assert.equal(child.candidateRule,undefined);assert.equal(degreeCandidateFit(course('CSCI 1113'),p).some(x=>x.result==='yes'),false);dom.window.close();
});

test('generic APAS route parsing is department-agnostic across Twin Cities colleges',()=>{
 const cases=[
  ['Psychology BA','PSY','3001'],['Marketing Major','MKTG','3010'],['Biology BS','BIOL','4003'],['Graphic Design BFA','GDES','3351'],['Nursing BSN','NURS','3700'],['History Minor','HIST','3001'],['Food Science BS','FSCN','4112'],['Educational Psychology Minor','EPSY','3264']
 ] as const;
 for(const[program,subject,number]of cases){const html=`<body><div id="audit"><div class="card-header"><h2>${program}</h2></div><div class="requirement Status_NO" rname="GEN" rqdsubreq="1"><div class="reqTitle">Approved ${subject} course</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1${subject}" number="${number}"></span></td></tr></tbody></table></div></div></body>`;const dom=new JSDOM(html),p=parseAPAS(dom.window.document);assert.equal(degreeFit(course(`${subject} ${number}`),p).some(x=>x.result==='yes'),true,program);assert.equal(degreeDiscoveryPlan(p,'UMNTC').explicitCodes.includes(`${subject} ${number}`),true,program);dom.window.close();}
});

test('deterministic APAS level labels create subject-range routes without a hardcoded major',()=>{
 const html='<body><div id="audit"><div class="card-header"><h2>Example Program</h2></div><div class="requirement Status_IP" rname="UPPER"><div class="reqTitle">4xxx/5xxx-level CSCI coursework</div><div class="reqBody"></div></div></div></body>';
 const dom=new JSDOM(html),p=parseAPAS(dom.window.document),r=flattenRequirements(p.requirements)[0];
 assert.equal(r.rule.type,'anyOf');assert.equal(degreeFit(course('CSCI 5421'),p).some(x=>x.result==='yes'),true);assert.equal(degreeFit(course('MATH 4242'),p).some(x=>x.result==='yes'),false);
 dom.window.close();
});
