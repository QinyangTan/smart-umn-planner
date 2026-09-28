import{test}from'node:test';
import assert from'node:assert/strict';
import{JSDOM}from'jsdom';
import{readFileSync,existsSync}from'node:fs';
import{installEnhancements,findCards,detectTerm,detectCampus}from'../apps/extension/schedule-dom.ts';
import type{CourseContext}from'../packages/schemas/index.ts';

const tick=()=>new Promise(r=>setTimeout(r,280));
const now='2026-09-26T23:00:00.000Z';

function context(code='CSCI 5302'):CourseContext{
 const [subject,catalogNumber]=code.split(' ');
 return{
  course:{
   data:{institution:'UMNTC',campus:'UMNTC',term:'1273',subject,catalogNumber,code,title:'Computational Genomics',description:'A current UMN course description.',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf',rules:[]},attributes:[],sectionIds:['10001'],equivalents:[],sourceRefs:{scheduleBuilder:'https://schedulebuilder.umn.edu/'},provenance:{source:'umn-schedule-builder',retrievedAt:now,period:'1273'}},
   stale:false,provenance:{source:'umn-schedule-builder',retrievedAt:now,period:'1273'},health:{source:'umn-schedule-builder',status:'healthy',checkedAt:now}
  },
  sections:{
   data:[{classNumber:'10001',sectionNumber:'001',courseCode:code,term:'1273',component:'LEC',credits:3,instructors:[{id:'umn:test',name:'Example Instructor',internetId:'test',aliases:['Example Instructor']}],meetings:[{days:['mon','wed'],startTime:'10:00',endTime:'11:15',location:'Keller 3-210'}],capacity:40,enrolled:31,waitlistCapacity:10,waitlistTotal:0,open:true,enrollable:true,instructionMode:'In Person',restrictions:[],prerequisiteRule:{type:'allOf',rules:[]},linkedClassNumbers:[],unresolvedLinks:false,scheduleKnown:true,provenance:{source:'umn-schedule-builder',retrievedAt:now,period:'1273'}}],
   stale:false,provenance:{source:'umn-schedule-builder',retrievedAt:now,period:'1273'},health:{source:'umn-schedule-builder',status:'healthy',checkedAt:now}
  },
  grades:{
   data:{courseCode:code,totalStudents:812,grades:{A:240,'A-':180,'B+':142,B:110,C:65,F:20,W:55},instructorRatings:[{instructorName:'Example Instructor',professorId:123456,quality:4.4,via:'gophergrades',source:'ratemyprofessors'}],distributions:[{instructorName:'Example Instructor',term:'1259',students:110,grades:{A:44,B:40,C:18,F:8}},{instructorName:'Example Instructor',term:'1269',students:120,grades:{A:50,B:40,C:20,F:10}}]},
   stale:false,provenance:{source:'gophergrades',retrievedAt:now,period:'1239–1263',sampleSize:812},health:{source:'gophergrades',status:'healthy',checkedAt:now}
  },
  feedback:{data:null,stale:false,provenance:{source:'umn-srt',retrievedAt:now,period:'Unavailable'},health:{source:'umn-srt',status:'down',checkedAt:now,message:'Not configured'}},
  community:[{
   id:'reddit-1',source:'reddit',entityType:'course',entityId:code,title:`${code} workload and projects?`,url:'https://www.reddit.com/r/uofmn/comments/example',publishedAt:'2026-09-20',excerpt:'Students discuss the weekly workload and project structure without a numeric rating.',topics:['workload','projects'],discoveredAt:now,provenance:{source:'reddit-browser',retrievedAt:now,period:'2026'}
  }]
 };
}

function fitFor(codes:string[]){
 return{connected:true,status:'UMN Connected · APAS Imported',items:codes.map(code=>({code,eligibility:{result:'yes' as const,reason:'Prerequisites satisfied by completed courses'},matches:[{requirementId:'r1',label:'CS Technical Electives',result:'yes' as const}]}))};
}

test('Schedule Builder renders a compact value-add insight rail without repeating native catalog details',async()=>{
 const dom=new JSDOM('<body><div class="course-list-results"><div><a name="CSCI5302"></a><div class="panel"><div class="panel-heading"><h3>CSCI 5302</h3></div><div class="panel-body"><p>Native Schedule Builder content</p></div></div></div></div></body>',{url:'https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/'});
 let batchCalls=0,fitCalls=0,connectCalls=0;
 const app=installEnhancements(dom.window.document,{
  batch:async codes=>{batchCalls++;return codes.map(c=>context(c));},
  fit:async courses=>{fitCalls++;return fitFor(courses.map(c=>c.code));},
  connect:async()=>{connectCalls++;}
 });
 await tick();
 assert.equal(batchCalls,1);assert.equal(fitCalls,1);
 assert.equal(dom.window.document.querySelectorAll('smart-umn-insight').length,1);
 const host=dom.window.document.querySelector('smart-umn-insight')!;
 assert.equal(host.getAttribute('data-render-mode'),'inline');
 assert.equal(host.parentElement?.className,'panel-body','Smart UMN mounts inside Schedule Builder native panel body');
 assert.ok(host.shadowRoot);
 assert.equal(host.querySelector('button'),null,'controls remain isolated in Shadow DOM');
 const shadow=host.shadowRoot!;
 assert.match(shadow.textContent||'',/CS Technical Electives/);
 assert.match(shadow.textContent||'',/Grade history/);assert.match(shadow.textContent||'',/3\.37 GPA/);assert.match(shadow.textContent||'',/812 students/);
 assert.match(shadow.textContent||'',/Professor/);assert.match(shadow.textContent||'',/4\.4\/5 RMP/);assert.match(shadow.textContent||'',/Student voices/);assert.match(shadow.textContent||'',/Themes: projects · workload/);assert.match(shadow.textContent||'',/Offering history/);
 assert.doesNotMatch(shadow.textContent||'',/A current UMN course description/);assert.doesNotMatch(shadow.textContent||'',/9 seats/);assert.doesNotMatch(shadow.textContent||'',/Keller 3-210/);assert.doesNotMatch(shadow.textContent||'',/LEC 001/);
 const direct=shadow.querySelector<HTMLAnchorElement>('.source-links .source-link');
 assert.equal(direct?.href,'https://www.reddit.com/r/uofmn/comments/example');assert.equal(direct?.target,'_blank');
 const community=shadow.querySelector<HTMLButtonElement>('[data-insight="references"] .more-link')!;
 community.click();
 assert.equal(shadow.querySelector('.body')?.getAttribute('data-active-tab'),'Community');
 assert.match(shadow.querySelector('.body')?.textContent||'',/curated source material only/i);assert.match(shadow.querySelector('.body')?.textContent||'',/workload/i);assert.match(shadow.querySelector('.body')?.textContent||'',/projects/i);
 assert.match(shadow.querySelector('.body')?.textContent||'',/weekly workload and project structure/i);
 assert.equal(shadow.querySelector<HTMLAnchorElement>('.body a.reference-title')?.href,'https://www.reddit.com/r/uofmn/comments/example');
 (shadow.querySelector('[data-insight="course-grades"]')as HTMLButtonElement).click();assert.equal(shadow.querySelector('.body')?.getAttribute('data-active-tab'),'Grades');assert.match(shadow.querySelector('.body')?.textContent||'',/Historical GPA trend/);assert.ok(shadow.querySelector('.trend svg'));
 (shadow.querySelector('[data-insight="offering-history"]')as HTMLButtonElement).click();assert.equal(shadow.querySelector('.body')?.getAttribute('data-active-tab'),'Offering');assert.match(shadow.querySelector('.body')?.textContent||'',/Observed offering history/);assert.match(shadow.querySelector('.body')?.textContent||'',/Fall terms observed/);
 app.scan();await tick();assert.equal(dom.window.document.querySelectorAll('smart-umn-insight').length,1);
 host.remove();app.scan();await tick();assert.equal(dom.window.document.querySelectorAll('smart-umn-insight').length,1);
 assert.equal(batchCalls,1,'rerender reuses public course cache');assert.equal(fitCalls,1,'rerender reuses APAS fit cache');
 assert.equal(connectCalls,0);
 app.disconnect();dom.window.close();
});

test('Schedule Builder APAS summary prioritizes current eligibility over a raw requirement match',async()=>{
 const dom=new JSDOM('<body><a name="CSCI5302"></a><div class="panel"><div class="panel-body"></div></div></body>',{url:'https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/'});
 const app=installEnhancements(dom.window.document,{
  batch:async()=>[context()],
  fit:async courses=>({connected:true,status:'UMN Connected',items:courses.map(c=>({code:c.code,eligibility:{result:'no' as const,reason:'Already completed; duplicate credit excluded'},matches:[{requirementId:'r1',label:'CS Technical Electives',result:'yes' as const}]}))}),
  connect:async()=>{}
 });
 await tick();
 const shadow=dom.window.document.querySelector('smart-umn-insight')!.shadowRoot!,degree=shadow.querySelector<HTMLButtonElement>('[data-insight="degree"]')!;
 assert.match(degree.textContent||'',/Not eligible now/);
 assert.match(degree.textContent||'',/Already completed; duplicate credit excluded/);
 assert.doesNotMatch(degree.textContent||'',/✓ CS Technical Electives/,'green requirement-match summary must not override ineligibility');
 degree.click();
 assert.match(shadow.querySelector('.body')?.textContent||'',/Already completed; duplicate credit excluded/);
 assert.match(shadow.querySelector('.body')?.textContent||'',/Matches remaining APAS requirements/,'detail may still explain why the course structurally matches APAS');
 app.disconnect();dom.window.close();
});

test('current instructor references are visible immediately without opening duplicate section details',async()=>{
 const dom=new JSDOM('<body><a name="CSCI5302"></a><div class="panel"><div class="panel-body"></div></div></body>',{url:'https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/'});
 const c=context();c.community.push({id:'rmp-1',source:'ratemyprofessor',entityType:'instructor',entityId:'instructor:example instructor',title:'Example Instructor at University of Minnesota - Twin Cities',url:'https://www.ratemyprofessors.com/professor/123456',topics:[],discoveredAt:now,provenance:{source:'ratemyprofessor:manual-link',retrievedAt:now,period:'Publication date not supplied'}});
 const app=installEnhancements(dom.window.document,{batch:async()=>[c],fit:async courses=>fitFor(courses.map(x=>x.code)),connect:async()=>{}});await tick();const shadow=dom.window.document.querySelector('smart-umn-insight')!.shadowRoot!;
 const professor=shadow.querySelector<HTMLElement>('[data-insight="instructor-intelligence"]')!;assert.ok(professor);assert.match(professor.textContent||'',/4\.4\/5 RMP/);assert.match(professor.textContent||'',/RMP count unavailable/);assert.equal(shadow.querySelectorAll('[data-insight="offering-history"]').length,1);
 app.disconnect();dom.window.close();
});

test('missing APAS keeps course evidence inline and offers Connect UMN inside the course card',async()=>{
 const dom=new JSDOM('<body><a name="CSCI5302"></a><div class="panel"><div class="panel-body"></div></div></body>',{url:'https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/'});
 let connects=0;
 const app=installEnhancements(dom.window.document,{
  batch:async()=>[context()],
  fit:async courses=>({connected:false,status:'',items:courses.map(c=>({code:c.code,eligibility:{result:'unknown' as const,reason:'Connect UMN to check prerequisites'},matches:[]}))}),
  connect:async()=>{connects++;}
 });
 await tick();const shadow=dom.window.document.querySelector('smart-umn-insight')!.shadowRoot!;
 const degree=shadow.querySelector<HTMLButtonElement>('button[data-insight="degree"]')!;degree.click();
 assert.match(shadow.querySelector('.body')?.textContent||'',/Connect UMN to show how this course fits/i);
 (shadow.querySelector('.body .link-button')as HTMLButtonElement).click();assert.equal(connects,1);
 assert.match(shadow.textContent||'',/(Excerpt|Reddit).*Course/i,'community source remains visible without APAS');
 app.disconnect();dom.window.close();
});

test('many inserted cards use one public-data batch and one degree-fit batch',async()=>{
 const d=new JSDOM('<body></body>',{url:'https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/'});
 const batches:string[][]=[],fits:string[][]=[];
 const app=installEnhancements(d.window.document,{
  batch:async codes=>{batches.push(codes);return codes.map(c=>context(c));},
  fit:async courses=>{fits.push(courses.map(c=>c.code));return fitFor(courses.map(c=>c.code));},
  connect:async()=>{}
 });
 d.window.document.body.innerHTML='<div class="course-list-results"><div><a name="CSCI5302"></a><div class="panel"><div class="panel-body"></div></div></div><div><a name="CSCI5521"></a><div class="panel"><div class="panel-body"></div></div></div></div>';
 await tick();
 assert.deepEqual(batches,[['CSCI 5302','CSCI 5521']]);
 assert.deepEqual(fits,[['CSCI 5302','CSCI 5521']]);
 assert.equal(d.window.document.querySelectorAll('smart-umn-insight').length,2);
 app.disconnect();d.window.close();
});


test('built Schedule Builder schedules receive one inline context row per native course header',async()=>{
 const html='<body><div id="schedule-courses"><table><tbody><tr id="course-head"><td></td><td colspan="3"><h4><a class="action-view" href="/explore/2027Spring/CSCI/5302/">CSCI 5302: Analysis of Numerical Algorithms</a></h4></td><td></td></tr><tr id="section-row"><td></td><td>57085</td><td>001 LEC</td><td>Keller</td><td></td></tr></tbody></table></div></body>';
 const d=new JSDOM(html,{url:'https://schedulebuilder.umn.edu/schedules/plan/'});let batches=0;
 assert.equal(detectTerm(d.window.document),'1273');assert.equal(findCards(d.window.document).length,1);assert.equal(findCards(d.window.document)[0].card.tagName,'TR');
 const app=installEnhancements(d.window.document,{batch:async codes=>{batches++;return codes.map(c=>context(c));},fit:async courses=>fitFor(courses.map(c=>c.code)),connect:async()=>{}});
 await tick();const host=d.window.document.querySelector('smart-umn-insight')!;assert.ok(host);assert.equal(host.parentElement?.className,'smart-umn-built-cell');assert.equal((host.parentElement as HTMLTableCellElement).colSpan,5);assert.equal(host.parentElement?.parentElement?.previousElementSibling?.id,'course-head');
 app.scan();await tick();assert.equal(d.window.document.querySelectorAll('tr.smart-umn-built-row').length,1);assert.equal(d.window.document.querySelectorAll('smart-umn-insight').length,1);assert.equal(batches,1);
 app.disconnect();d.window.close();
});

test('personalization refresh rerenders degree fit without refetching public course context',async()=>{
 const d=new JSDOM('<body><a name="CSCI5302"></a><div class="panel"><div class="panel-body"></div></div></body>',{url:'https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/'});
 let batches=0,fits=0,connected=false;
 const app=installEnhancements(d.window.document,{
  batch:async()=>{batches++;return[context()];},
  fit:async courses=>{fits++;return connected?fitFor(courses.map(c=>c.code)):{connected:false,items:courses.map(c=>({code:c.code,eligibility:{result:'unknown' as const,reason:'Connect UMN'},matches:[]}))};},
  connect:async()=>{}
 });
 await tick();assert.match(d.window.document.querySelector('smart-umn-insight')!.shadowRoot!.textContent||'',/Connect UMN/);
 connected=true;app.refreshPersonalization();await tick();
 assert.match(d.window.document.querySelector('smart-umn-insight')!.shadowRoot!.textContent||'',/CS Technical Electives/);
 assert.equal(batches,1);assert.equal(fits,2);
 app.disconnect();d.window.close();
});

test('search-result panels can be recognized from native action-view links without anchor names',()=>{
 const d=new JSDOM('<body><div class="panel"><div class="panel-heading"><a class="action-view" href="/explore/2027Spring/CSCI/4041/">CSCI 4041: Algorithms and Data Structures</a></div><div class="panel-body"></div></div></body>',{url:'https://schedulebuilder.umn.edu/search/2027Spring/'}).window.document;
 const found=findCards(d);assert.equal(found.length,1);assert.equal(found[0].code,'CSCI 4041');assert.equal(found[0].card.className,'panel');assert.equal(detectTerm(d),'1273');
});

test('Schedule Builder campus is read from its own persisted campus selection',()=>{const d=new JSDOM('<body></body>',{url:'https://schedulebuilder.umn.edu/'});d.window.localStorage.setItem('SB2_the_search_for_more_storage',JSON.stringify({campus:'UMNDL',institution:'UMNDL',term:'1273'}));assert.equal(detectCampus(d.window.document),'UMNDL');d.window.close();});

test('non-Twin-Cities Schedule Builder pages do not receive Smart UMN UI or public-data calls',async()=>{const d=new JSDOM('<body><a name="CS1411"></a><div class="panel"><div class="panel-body"></div></div></body>',{url:'https://schedulebuilder.umn.edu/redirect/UMNDL/explore/2027Spring/CS/1411/'});let batches=0;const app=installEnhancements(d.window.document,{batch:async()=>{batches++;return[];},fit:async()=>({connected:false,items:[]}),connect:async()=>{}});await tick();assert.equal(detectCampus(d.window.document),'UMNDL');assert.equal(batches,0);assert.equal(d.window.document.querySelectorAll('smart-umn-insight').length,0);app.disconnect();d.window.close();});

test('term and card detection fail closed outside known structures',()=>{
 const d=new JSDOM('<body><p>CSCI 5302 mentioned casually</p></body>',{url:'https://schedulebuilder.umn.edu/'}).window.document;
 assert.equal(detectTerm(d),undefined);assert.equal(findCards(d).length,0);
});

test('package and extension manifest versions stay aligned for release artifacts',()=>{const pkg=JSON.parse(readFileSync('package.json','utf8')),m=JSON.parse(readFileSync('apps/extension/manifest.json','utf8'));assert.equal(m.version,pkg.version);});

test('manifest and build are inline-only: no side-panel permission or side-panel bundle',()=>{
 const m=JSON.parse(readFileSync('apps/extension/manifest.json','utf8'));
 assert.ok(!m.permissions.some((s:string)=>['cookies','debugger','webRequest','identity','history','sidePanel'].includes(s)));
 assert.equal(m.side_panel,undefined);
 assert.ok(m.host_permissions.includes('https://schedulebuilder.umn.edu/*'),'background can refresh already-open Twin Cities Schedule Builder tabs after APAS changes');assert.equal(m.host_permissions.some((x:string)=>x.includes('*.schedulebuilder.umn.edu')),false);
 assert.ok(!JSON.stringify(m).includes('<all_urls>'));assert.ok(!JSON.stringify(m).includes('login.umn'));
 const bg=readFileSync('apps/extension/background.ts','utf8');assert.ok(!bg.includes('chrome.sidePanel'));assert.ok(bg.includes('PERSONALIZATION_CHANGED'));assert.ok(bg.includes("case'SAVE_PROFILE'"),'validated local recovery profiles can sync into extension storage');
 const bridge=readFileSync('apps/extension/bridge.ts','utf8');assert.ok(bridge.includes("'SAVE_PROFILE'"),'localhost planner bridge allows the validated recovery-profile sync action');
 const web=readFileSync('apps/web/app.ts','utf8');assert.ok(web.includes("send('SAVE_PROFILE',profile)"),'recovery import syncs the normalized profile when the extension is present');
 const schedule=readFileSync('apps/extension/schedule.ts','utf8');assert.ok(schedule.includes('PERSONALIZATION_CHANGED'));
 const build=readFileSync('scripts/build.mjs','utf8');assert.ok(!build.includes("'panel'"));assert.ok(!build.includes('panel.html'));assert.equal(existsSync('apps/extension/panel.ts'),false);assert.equal(existsSync('apps/extension/panel.html'),false);
});
