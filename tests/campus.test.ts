import{test}from'node:test';
import assert from'node:assert/strict';
import{JSDOM}from'jsdom';
import{Store}from'../packages/providers/store.ts';
import{ContextService,ScheduleBuilderProvider}from'../packages/providers/index.ts';
import{parseAPAS}from'../packages/apas-parser/index.ts';
import{enrichGeneralEducation}from'../packages/core/general-education.ts';
import{degreeFit,degreeCandidateFit,matches,discoverDegreeCandidates}from'../packages/core/rules.ts';
import{courseEntityKey}from'../packages/schemas/index.ts';
import type{Course,Evidence,GeneralEducationCatalog,GradeEvidence,Section,StudentAcademicProfile}from'../packages/schemas/index.ts';

const now='2026-09-27T03:30:00.000Z';
const prov=(source='fixture',period='1273')=>({source,retrievedAt:now,period});
const evidence=<T>(data:T,source='fixture'):Evidence<T>=>({data,stale:false,provenance:prov(source),health:{source,status:'healthy',checkedAt:now}});
function course(code:string,campus:'UMNTC'|'UMNDL'|'UMNCR'|'UMNMO'|'UMNRO'='UMNTC',attributes:string[]=[]):Course{const[subject,catalogNumber]=code.split(' '),institution=campus==='UMNRO'?'UMNTC':campus;return{institution,campus,term:'1273',subject,catalogNumber,code,title:code,description:'fixture',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf',rules:[]},attributes,sectionIds:['1'],equivalents:[],sourceRefs:{},provenance:prov()};}

test('APAS selectable courses preserve all five UMN campus prefixes',()=>{
 const dom=new JSDOM('<body><div id="audit"><div class="card-header"><h2>Cross-campus fixture</h2></div><div class="requirement Status_NO" rname="REQ" rqdhours="3"><div class="reqTitle">Campus choices</div><div class="selectcourses"><span class="course" department="1PSY" number="1001"></span><span class="course" department="3CS" number="1411"></span><span class="course" department="4CSCI" number="1201"></span><span class="course" department="5ACCT" number="2101"></span><span class="course" department="6BIOL" number="2331"></span></div></div></div></body>');
 const p=parseAPAS(dom.window.document),json=JSON.stringify(p.requirements[0].rule);
 for(const campus of ['UMNTC','UMNDL','UMNMO','UMNCR','UMNRO'])assert.match(json,new RegExp(campus));
 dom.window.close();
});

test('campus-specific requirement cannot be satisfied by a same-code course on another campus',()=>{
 assert.equal(matches({type:'course',code:'CS 1411',campus:'UMNDL'},course('CS 1411','UMNDL')),'yes');
 assert.equal(matches({type:'course',code:'CS 1411',campus:'UMNDL'},course('CS 1411','UMNTC')),'no');
 assert.equal(matches({type:'range',subject:'CS',min:1000,max:1999,campus:'UMNDL'},course('CS 1411','UMNTC')),'no');
});

test('official Schedule Builder general-education catalog enriches only exact APAS category names',()=>{
 const base:StudentAcademicProfile={program:{name:'Synthetic Liberal Arts',campus:'UMNTC'},degreeCredits:{},completedCourses:[],inProgressCourses:[],transferCourses:[],requirements:[
  {id:'soc',label:'Social Sciences',status:'incomplete',coursesUsed:[],children:[],rule:{type:'unknown',sourceText:'Social Sciences',reason:'fixture'},rawMetadata:{}},
  {id:'near',label:'Social Science Methods',status:'incomplete',coursesUsed:[],children:[],rule:{type:'unknown',sourceText:'Social Science Methods',reason:'fixture'},rawMetadata:{}},
  {id:'bio',label:'Biological Sciences with lab or field experience',status:'incomplete',coursesUsed:[],children:[],rule:{type:'unknown',sourceText:'Biological Sciences with lab or field experience',reason:'fixture'},rawMetadata:{}}
 ],syncedAt:now,parserVersion:'fixture',warnings:[],provenance:prov()};
 const catalog:GeneralEducationCatalog={campus:'UMNTC',institution:'UMNTC',term:'1273',name:'Liberal Education Requirements',requirements:[{attribute:'CLE',value:'SOCS',token:'SOCS',name:'Social Sciences'},{attribute:'CLE',value:'BIOL',token:'BIOL',name:'Biological Sciences'}],provenance:prov('umn-schedule-builder')};
 const p=enrichGeneralEducation(base,catalog),c=course('PSY 1001','UMNTC',[JSON.stringify({attribute:'CLE',attribute_value:'SOCS',name:'Social Sciences'})]);
 assert.equal(degreeFit(c,p).find(x=>x.requirementId==='soc')?.result,'yes');
 assert.equal(p.requirements.find(r=>r.id==='near')?.rule.type,'unknown','fuzzy labels never authorize a course');
 assert.equal(p.requirements.find(r=>r.id==='bio')?.rule.type,'unknown','qualified labels do not become strict rules');assert.equal(p.requirements.find(r=>r.id==='bio')?.candidateRule?.type,'attribute','official category is retained as a candidate route without dropping the lab qualifier');
});

test('qualified Liberal Education policy keeps the official base category candidate-only',()=>{const dom=new JSDOM('<body><div id="audit"><div class="card-header"><h2>Example Degree</h2></div><div class="requirement Status_NO" rname="BIO" rqdsubreq="1" rqdhours="2"><div class="reqTitle">Biological Sciences with lab or field experience</div></div></div></body>');const raw=parseAPAS(dom.window.document);dom.window.close();assert.equal(raw.requirements[0].rule.type,'policy');assert.equal(raw.requirements[0].rule.type==='policy'?raw.requirements[0].rule.family:'','qualified-attribute');const catalog:GeneralEducationCatalog={campus:'UMNTC',institution:'UMNTC',term:'1273',name:'Liberal Education Requirements',requirements:[{attribute:'CLE',value:'BIOL',token:'BIOL',name:'Biological Sciences'}],provenance:prov('umn-schedule-builder')};const p=enrichGeneralEducation(raw,catalog),c=course('BIOL 1001','UMNTC',[JSON.stringify({attribute:'CLE',attribute_value:'BIOL',name:'Biological Sciences'})]);assert.equal(p.requirements[0].rule.type,'policy');assert.equal(p.requirements[0].candidateRule?.type,'attribute');assert.equal(degreeFit(c,p).some(x=>x.result==='yes'),false);assert.equal(degreeCandidateFit(c,p).some(x=>x.result==='yes'&&!x.strict),true);});

test('degree discovery keeps proven APAS matches visible when prerequisite metadata is unknown',()=>{
 const profile:StudentAcademicProfile={program:{name:'Synthetic Duluth',campus:'UMNDL'},degreeCredits:{},completedCourses:[],inProgressCourses:[],transferCourses:[],requirements:[{id:'soc',label:'Social Sciences',status:'incomplete',coursesUsed:[],children:[],rule:{type:'attribute',attribute:'DLE',value:'SOC SCI',name:'Social Sciences',campus:'UMNDL'},rawMetadata:{}}],syncedAt:now,parserVersion:'fixture',warnings:[],provenance:prov()};
 const c=course('SOC 1101','UMNDL',[JSON.stringify({attribute:'DLE',attribute_value:'SOC SCI',name:'Social Sciences'})]);c.prerequisiteRule={type:'unknown',sourceText:'',reason:'No prerequisite information supplied'};
 assert.deepEqual(discoverDegreeCandidates([c],profile).map((x:Course)=>x.code),['SOC 1101']);
});

test('Schedule Builder provider uses campus-specific institution mapping including Rochester',async()=>{
 const calls:string[]=[];const fetcher:typeof fetch=async input=>{const u=new URL(String(input));calls.push(u.href);return new Response(JSON.stringify({complete:true,valid:true,id:1,institution:'UMNTC',campus:'UMNRO',term:1273,subject:'BIOL',catalog_nbr:'2331',title:'Anatomy and Physiology I',description:['Body systems.','prereq: No prerequisites'],credits:'4.00',min_credits:'4.00',max_credits:'4.00',attributes:[{attribute:'RGE',attribute_value:'LS',name:'Laboratory Sciences'}],equivalents:[],sections:[70001]}),{status:200});};
 const store=new Store(':memory:');try{const p=new ScheduleBuilderProvider(store,fetcher),r=await p.fetchCourse('BIOL 2331','1273','UMNRO');assert.equal(r.data?.campus,'UMNRO');assert.equal(r.data?.institution,'UMNTC');const u=new URL(calls[0]);assert.equal(u.searchParams.get('institution'),'UMNTC');assert.equal(u.searchParams.get('campus'),'UMNRO');}finally{store.close();}
});

test('Schedule Builder provider exposes campus general-education metadata and attribute course discovery',async()=>{
 const calls:string[]=[];const root='<script>SB2.Application.requirements = {"UMNDL":{"1273":{"name":"Liberal Education Requirements","attrs":["DLE"],"tokens":{"SOC SCI":"SOCSCI"},"requirements":{"SOC SCI":"Social Sciences"}}}};</script>';
 const fetcher:typeof fetch=async input=>{const u=new URL(String(input));calls.push(u.href);if(u.pathname==='/')return new Response(root,{status:200,headers:{'content-type':'text/html'}});const type=u.searchParams.get('type');if(type==='courses_crse_attr')return new Response(JSON.stringify([9]),{status:200});if(type==='courses')return new Response(JSON.stringify([{complete:true,valid:true,id:9,institution:'UMNDL',campus:'UMNDL',term:1273,subject:'SOC',catalog_nbr:'1101',title:'Introduction to Sociology',description:['Society.','prereq: No prerequisites'],credits:'4.00',min_credits:'4.00',max_credits:'4.00',attributes:[{attribute:'DLE',attribute_value:'SOC SCI',name:'Social Sciences'}],equivalents:[],sections:[80001]}]),{status:200});return new Response('[]',{status:200});};
 const store=new Store(':memory:');try{const p=new ScheduleBuilderProvider(store,fetcher),g=await p.fetchGeneralEducationCatalog('UMNDL','1273');assert.equal(g.data?.requirements[0].name,'Social Sciences');assert.equal(g.data?.requirements[0].value,'SOC SCI');const a=await p.fetchAttributeCourses('DLE','SOC SCI','1273','UMNDL');assert.deepEqual(a.data?.map(c=>c.code),['SOC 1101']);const q=new URL(calls.find(x=>x.includes('courses_crse_attr'))!);assert.equal(q.searchParams.get('institution'),'UMNDL');assert.equal(q.searchParams.get('campus'),'UMNDL');}finally{store.close();}
});

test('non-Twin-Cities context never substitutes Twin Cities GopherGrades or community evidence',async()=>{
 const store=new Store(':memory:');const tc={id:'tc',source:'reddit' as const,entityType:'course' as const,entityId:'CS 1411',title:'TC only',url:'https://example.com/tc',topics:[],discoveredAt:now,provenance:prov('fixture')};const dl={...tc,id:'dl',entityId:courseEntityKey('CS 1411','UMNDL'),title:'Duluth only',url:'https://example.com/dl'};store.reference(tc);store.reference(dl);
 try{const service=new ContextService(store),c=course('CS 1411','UMNDL');let ggCalls=0;(service.sb as any).fetchCourse=async()=>evidence(c,'umn-schedule-builder');(service.sb as any).fetchSections=async()=>evidence([] as Section[],'umn-schedule-builder');(service.gg as any).fetch=async()=>{ggCalls++;return evidence({courseCode:'CS 1411',totalStudents:1,grades:{A:1},distributions:[]} as GradeEvidence,'gophergrades');};(service.srt as any).fetch=async()=>evidence(null,'umn-srt');
 const ctx=await service.get('CS 1411','1273','UMNDL');assert.equal(ggCalls,0);assert.equal(ctx.grades.data,null);assert.match(ctx.grades.health.message||'',/not verified for this campus/);assert.deepEqual(ctx.community.map(r=>r.title),['Duluth only']);}finally{store.close();}
});
