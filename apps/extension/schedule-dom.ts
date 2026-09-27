import{currentInstructorSignals,redditCourseSearch}from'../../packages/community/signals.ts';
import{communityHTML}from'../../packages/ui/index.ts';
import{campusCode,courseCode,UMN_CAMPUSES}from'../../packages/schemas/index.ts';
import type{Course,CourseContext,Truth,UMNCampus}from'../../packages/schemas/index.ts';
import{currentInstructorGradeHistory,gradeDistributionSummary,referenceEntityLabel}from'../../packages/ui/index.ts';

type Tab='Degree'|'Grades'|'Community';
export type InlineFitItem={
 code:string;
 eligibility:{result:Truth;reason:string};
 matches:{requirementId:string;label:string;result:Truth}[];
 routes?:{requirementId:string;label:string;result:Truth;strict:boolean}[];
};
export type InlineFitResponse={connected:boolean;status?:string;items:InlineFitItem[]};
type Client={
 batch:(codes:string[],term:string,campus:UMNCampus)=>Promise<CourseContext[]|{error:string}>;
 fit:(courses:Course[])=>Promise<InlineFitResponse|{error:string}>;
 connect:()=>Promise<unknown>|unknown;
};

const CACHE_MS=30_000;
const gradeOrder=['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F','S','N','W'];
const css=`
:host{--maroon:#7a0019;--line:#d5d6d2;--off:#f9f7f6;display:block;margin:10px 0 0;color:#2d2d2d;font:12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}
.wrap{border-top:1px solid #dedede;padding-top:9px}
.topline{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.brand{display:inline-flex;align-items:center;gap:6px;font-weight:750;color:#6d001f;letter-spacing:.01em}
.brand:before{content:"";width:5px;height:15px;border-radius:2px;background:#ffcc33;box-shadow:inset 0 0 0 1px #d7a900}
.context{margin-left:auto;color:#777;font-size:10px}
.rail{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.insight{position:relative;min-width:0;min-height:86px;padding:10px 11px;border:1px solid #dedede;border-radius:8px;background:#fff;text-align:left;color:#333;font:inherit;box-shadow:0 1px 2px rgba(0,0,0,.03)}
button.insight{cursor:pointer}
button.insight:hover,button.insight[aria-expanded="true"]{border-color:#6d001f;box-shadow:0 0 0 1px rgba(109,0,31,.08)}
.insight.good{border-left:4px solid #4d8a5b}
.insight.warn{border-left:4px solid #c6962c}
.insight.neutral{border-left:4px solid #6d001f}
.kicker{display:block;color:#767676;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px}
.value{display:block;color:#262626;font-size:13px;font-weight:720;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub{display:block;color:#6f6f6f;font-size:10px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spark{height:18px;display:flex;gap:2px;align-items:flex-end;margin-top:7px}
.spark i{display:block;flex:1;min-width:2px;border-radius:2px 2px 0 0;background:#d8d8d8;opacity:.9}
.spark i.a{background:#5e9b68}.spark i.b{background:#c2a638}.spark i.c{background:#c77c36}.spark i.d,.spark i.f{background:#b95c61}
.source-links{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
.source-link{display:inline-flex;align-items:center;max-width:100%;padding:3px 6px;border:1px solid #e1d5d8;border-radius:999px;color:#6b2232;text-decoration:none;background:#fff7f8;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.source-link:hover{text-decoration:underline;border-color:#b98e98}
.more-link{color:#6b2232;text-decoration:none;font-size:10px}
.more-link:hover{text-decoration:underline}
.body{margin-top:9px;padding:12px 13px;background:#fafafa;border:1px solid #e4e4e4;border-radius:7px}
.body h4{font-size:12px;margin:0 0 8px;color:#444}
.body p{margin:6px 0 9px}
.muted{color:#777;font-size:10px}
.good-text{color:#28643a}.warn-text{color:#7d631e}.bad-text{color:#8c2f39}
.bars{display:grid;gap:5px;margin:8px 0 10px}
.bar{display:grid;grid-template-columns:28px 1fr 54px;gap:7px;align-items:center;font-size:10px}
.track{height:8px;border-radius:999px;background:#ececec;overflow:hidden}.fill{height:100%;background:#6d001f;border-radius:999px}
.reference{padding:9px 0;border-top:1px solid #e5e5e5}.reference:first-of-type{border-top:0}
.reference-title{display:block;color:#6b2232;font-weight:600;text-decoration:none;margin:2px 0 4px}.reference-title:hover{text-decoration:underline}
.tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.tag{background:#eee;border-radius:3px;padding:1px 5px;color:#666;font-size:9px}
.actions{display:flex;gap:12px;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid #e6e6e6}
.actions a,.link-button{color:#6b2232;text-decoration:none;background:none;border:0;padding:0;font:inherit;cursor:pointer}.actions a:hover,.link-button:hover{text-decoration:underline}
.loading{color:#777}
.community-heading{display:flex;justify-content:space-between;gap:10px;align-items:center}.community-heading h3{margin:5px 0;font-size:18px}.eyebrow,.evidence-label{font-size:9px;letter-spacing:.04em;color:#6d001f}.instructor-signals{display:grid;gap:8px;margin:12px 0}.instructor-signal{display:grid;grid-template-columns:1fr auto;gap:8px;border:1px solid #dedede;background:#fff;padding:12px}.instructor-signal h4{margin:0 0 4px}.instructor-signal small{font-size:10px;color:#666}.rmp-metric{text-align:right}.rmp-metric strong{font-size:22px;color:#7a0019}.rmp-metric span{display:block;font-size:10px}.metric-provenance,.community-links{grid-column:1/-1;font-size:10px}.community-links{display:flex;gap:12px;flex-wrap:wrap}.community-evidence a{color:#7a0019}.discussion-heading{margin-top:16px}.topic-tags{display:flex;gap:5px;margin:6px 0}.topic-tags span{padding:2px 6px;background:#eee;font-size:10px}.reference h4{margin:6px 0}.reference>small{font-size:10px;color:#666}
@media(prefers-reduced-motion:no-preference){.body{animation:reveal .16s ease-out}@keyframes reveal{from{opacity:.4;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}}
@media(max-width:1050px){.rail{grid-template-columns:repeat(2,minmax(180px,1fr))}}
@media(max-width:680px){.rail{grid-template-columns:1fr}.context{display:none}.insight{min-height:74px}}
`;

export function detectTerm(doc:Document):string|undefined{
 const fromPath=(value:string)=>{const match=/\/(\d{4})(Spring|Summer|Fall)\//.exec(value);return match?`1${match[1].slice(2)}${{Spring:3,Summer:5,Fall:9}[match[2]]}`:undefined;};
 const pathTerm=fromPath(doc.location?.pathname||'');if(pathTerm)return pathTerm;
 const term=(doc.querySelector('select[name="term"]')as HTMLSelectElement)?.value;if(term&&/^1\d{2}[359]$/.test(term))return term;
 // Built-schedule pages omit the semester from their own URL, but every course
 // header links back to /explore/<term>/.... Reuse that explicit native link.
 const courseLink=doc.querySelector<HTMLAnchorElement>('#schedule-courses a.action-view[href*="/explore/"]');
 return courseLink?fromPath(new URL(courseLink.href,doc.location?.href).pathname):undefined;
}

export function detectCampus(doc:Document):UMNCampus|undefined{try{const fromPath=/\/redirect\/(UMN(?:TC|DL|CR|MO|RO))(?:\/|$)/.exec(doc.location?.pathname||'')?.[1];if(fromPath)return campusCode(fromPath);const raw=doc.defaultView?.localStorage.getItem('SB2_the_search_for_more_storage');if(!raw)return;const state=JSON.parse(raw);return state?.campus?campusCode(String(state.campus)):undefined;}catch{return;}}

export function findCards(doc:Document):{card:Element;code:string}[]{
 const found=new Map<Element,string>();
 for(const a of doc.querySelectorAll('a[name]')){
  try{
   const code=courseCode(a.getAttribute('name')||'');
   const card=a.nextElementSibling;
   if(card?.matches('.panel'))found.set(card,code);
  }catch{}
 }
 // Schedule Builder has used both anchor→panel siblings and wrapper→panel
 // markup. GopherGrades also targets the native .panel-body, so support both
 // without guessing from arbitrary page text.
 for(const panel of doc.querySelectorAll('.course-list-results .panel')){
  if(found.has(panel))continue;
  const a=panel.parentElement?.querySelector('a[name]');
  try{if(a)found.set(panel,courseCode(a.getAttribute('name')||''));}catch{}
 }
 for(const panel of doc.querySelectorAll('.panel')){
  if(found.has(panel))continue;const a=panel.querySelector<HTMLAnchorElement>('a.action-view[href*="/explore/"]');if(!a)continue;
  try{const href=new URL(a.href,doc.location?.href),m=/\/explore\/[^/]+\/([A-Z]{2,8})\/(\d{1,4}[A-Z]?)\/?/i.exec(href.pathname);if(m)found.set(panel,courseCode(m[1]+m[2]));}catch{}
 }
 for(const row of doc.querySelectorAll('#schedule-courses tr')){
  const a=row.querySelector<HTMLAnchorElement>('h4 a.action-view[href]');if(!a)continue;
  const href=new URL(a.href,doc.location?.href);const m=/\/explore\/[^/]+\/([A-Z]{2,8})\/(\d{1,4}[A-Z]?)\/?/i.exec(href.pathname);
  try{found.set(row,courseCode(m?m[1]+m[2]:(a.textContent||'').split(':')[0]));}catch{}
 }
 const info=doc.querySelector('#crse-info');
 if(info&&!found.size){
  const heading=info.querySelector('.panel-heading,h2,h3');
  const m=/\b([A-Z]{2,8})\s*(\d{1,4}[A-Z]?)\b/.exec(heading?.textContent||'');
  if(m)found.set(info,courseCode(m[1]+m[2]));
 }
 return[...found].map(([card,code])=>({card,code}));
}

function safeExternal(raw:string):string|undefined{
 try{const u=new URL(raw);return u.protocol==='https:'||u.protocol==='http:'?u.href:undefined;}catch{return;}
}
function plannerUrl(code:string,term:string,campus:UMNCampus='UMNTC'){return`http://127.0.0.1:4317/?course=${encodeURIComponent(code)}&term=${encodeURIComponent(term)}&campus=${encodeURIComponent(campus)}`;}
function newestReferences(c?:CourseContext){return[...(c?.community||[])].sort((a,b)=>(b.publishedAt||b.discoveredAt).localeCompare(a.publishedAt||a.discoveredAt));}
function inlineMount(card:Element,code:string){
 if(card.tagName==='TR'){
  const existing=card.nextElementSibling;if(existing?.matches('tr.smart-umn-built-row'))return existing.querySelector('td')||existing;
  const row=card.ownerDocument.createElement('tr');row.className='smart-umn-built-row';row.setAttribute('data-smart-umn-course',code);
  const cell=card.ownerDocument.createElement('td');cell.className='smart-umn-built-cell';const span=[...card.children].reduce((n,c)=>n+Math.max(1,(c as HTMLTableCellElement).colSpan||1),0);cell.colSpan=Math.max(1,span);cell.style.padding='0 8px 10px';cell.style.background='#fff';row.append(cell);card.insertAdjacentElement('afterend',row);return cell;
 }
 return card.querySelector('.panel-body')||card;
}
function removeInlineHost(host:HTMLElement){const row=host.closest('tr.smart-umn-built-row');if(row)row.remove();else host.remove();}
function short(s:string,n:number){return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;}
function el<K extends keyof HTMLElementTagNameMap>(doc:Document,tag:K,className?:string,text?:string){const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function gradeTone(grade:string){return/^A/.test(grade)?'a':/^B/.test(grade)?'b':/^C/.test(grade)?'c':/^D/.test(grade)?'d':grade==='F'?'f':'';}
function gradeSpark(doc:Document,grades:Record<string,number>){const order=['F','D-','D','D+','C-','C','C+','B-','B','B+','A-','A','A+'],max=Math.max(1,...order.map(g=>grades[g]||0)),spark=el(doc,'div','spark');spark.setAttribute('aria-label','Historical grade distribution');for(const grade of order){const count=grades[grade]||0,i=el(doc,'i',gradeTone(grade));i.style.height=`${Math.max(count?14:2,Math.round(count/max*100))}%`;i.title=`${grade}: ${count.toLocaleString()}`;spark.append(i);}return spark;}
function insightButton(doc:Document,kicker:string,value:string,sub:string,tone:string,tab:Tab,active:Tab|undefined,onToggle:()=>void){const b=el(doc,'button',`insight ${tone}`);b.type='button';b.setAttribute('aria-expanded',String(active===tab));b.setAttribute('aria-label',`${kicker}: ${value}; ${active===tab?'collapse':'expand'} details`);b.append(el(doc,'span','kicker',kicker),el(doc,'span','value',value),el(doc,'span','sub',sub));b.onclick=onToggle;return b;}
function addPlannerAction(doc:Document,parent:Element,code:string,term:string,campus:UMNCampus='UMNTC'){
 const actions=el(doc,'div','actions');
 const link=el(doc,'a');link.href=plannerUrl(code,term,campus);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open full course page ↗';actions.append(link);parent.append(actions);
}
function renderGrades(doc:Document,parent:Element,c:CourseContext,code:string,term:string){
 const g=c.grades.data;
 if(!g){parent.append(el(doc,'p','muted',c.grades.health.message||'Historical grades are unavailable right now.'));addPlannerAction(doc,parent,code,term,c.course.data?.campus||'UMNTC');return;}
 parent.append(el(doc,'p',undefined,`Historical grade distribution · ${g.totalStudents.toLocaleString()} students`));
 const entries=Object.entries(g.grades).filter(([,n])=>n>0).sort(([a],[b])=>{
  const ai=gradeOrder.indexOf(a),bi=gradeOrder.indexOf(b);return(ai<0?999:ai)-(bi<0?999:bi);
 });
 const max=Math.max(1,...entries.map(([,n])=>n));const bars=el(doc,'div','bars');
 for(const[grade,count]of entries){
  const row=el(doc,'div','bar');row.append(el(doc,'span',undefined,grade));
  const track=el(doc,'div','track'),fill=el(doc,'div','fill');fill.style.width=`${Math.max(1,count/max*100)}%`;track.append(fill);row.append(track);
  row.append(el(doc,'span',undefined,count.toLocaleString()));bars.append(row);
 }
 parent.append(bars);
 const current=currentInstructorGradeHistory(c);
 if(current.length){parent.append(el(doc,'h4',undefined,'Current instructor historical records'));for(const history of current){parent.append(el(doc,'p','muted',`${history.name} · ${history.students.toLocaleString()} historical students · ${history.terms.join(', ')}`));const rows=Object.entries(history.grades).filter(([,n])=>n>0),max=Math.max(1,...rows.map(([,n])=>n));const detail=el(doc,'div','bars');for(const[grade,count]of rows){const row=el(doc,'div','bar');row.append(el(doc,'span',undefined,grade));const track=el(doc,'div','track'),fill=el(doc,'div','fill');fill.style.width=`${Math.max(1,count/max*100)}%`;track.append(fill);row.append(track);row.append(el(doc,'span',undefined,count.toLocaleString()));detail.append(row);}parent.append(detail);}}
 parent.append(el(doc,'p','muted',`GopherGrades · ${c.grades.provenance.period} · retrieved ${new Date(c.grades.provenance.retrievedAt).toLocaleString()}`));
 parent.append(el(doc,'p','muted','Historical outcomes describe past cohorts; they do not predict your grade.'));
 addPlannerAction(doc,parent,code,term,c.course.data?.campus||'UMNTC');
}
function renderCommunity(doc:Document,parent:Element,c:CourseContext,code:string,term:string){
 // Shared renderer escapes text and allowlists external community links.
 parent.innerHTML=communityHTML(c);
 parent.append(el(doc,'p','muted','Community references are source material only. RMP aggregates are third-party opinions, not a Smart UMN quality score.'));
 const actions=el(doc,'div','actions'),link=el(doc,'a',undefined,'Read sources & set my instructor preference ↗');link.href=plannerUrl(code,term,c.course.data?.campus||'UMNTC');link.target='_blank';link.rel='noopener noreferrer';actions.append(link);parent.append(actions);
}
function renderDegree(doc:Document,parent:Element,fit:InlineFitItem|undefined,connected:boolean,code:string,term:string,campus:UMNCampus,client:Client){
 if(!connected){
  parent.append(el(doc,'p',undefined,'Connect UMN to show how this course fits your current APAS degree audit.'));
  const button=el(doc,'button','link-button','Connect UMN →');button.type='button';button.onclick=()=>{void client.connect();};parent.append(button);
  return;
 }
 if(!fit){parent.append(el(doc,'p','muted','APAS fit is not available for this course.'));return;}
 const statusClass=fit.eligibility.result==='yes'?'good-text':fit.eligibility.result==='no'?'bad-text':'warn-text';
 parent.append(el(doc,'p',statusClass,fit.eligibility.reason));
 const yes=fit.matches.filter(m=>m.result==='yes'),unknown=fit.matches.filter(m=>m.result==='unknown'),routes=(fit.routes||[]).filter(m=>m.result==='yes'&&!m.strict);
 if(yes.length){parent.append(el(doc,'h4',undefined,'Matches remaining APAS requirements'));for(const m of yes)parent.append(el(doc,'p','good-text',`✓ ${m.label}`));}
 else if(routes.length){parent.append(el(doc,'h4',undefined,'Candidate APAS routes'));for(const m of routes.slice(0,5))parent.append(el(doc,'p','warn-text',`◇ ${m.label} · quantitative cap/condition still needs review`));}
 else parent.append(el(doc,'p','muted','No proven match to a remaining APAS requirement.'));
 if(unknown.length){parent.append(el(doc,'h4',undefined,'Needs review'));for(const m of unknown.slice(0,5))parent.append(el(doc,'p','warn-text',`? ${m.label}`));}
 parent.append(el(doc,'p','muted','APAS rules can include credit caps and degree-wide conditions. This is an explanation aid, not a guarantee that a course will apply exactly as shown.'));
 addPlannerAction(doc,parent,code,term,campus);
}

export function installEnhancements(doc:Document,client:Client){
 const win=doc.defaultView!;
 const queue=new Map<Element,string>();
 const hosts=new Map<Element,{code:string;term:string;campus:UMNCampus;host:HTMLElement}>();
 const contextCache=new Map<string,{at:number;context:CourseContext}>();
 const fitCache=new Map<string,{at:number;fit:InlineFitItem;connected:boolean;status?:string}>();
 let timer:ReturnType<typeof setTimeout>|undefined,stopped=false;

 async function flush(){
  const term=detectTerm(doc);if(!term)return;const campus=detectCampus(doc)||'UMNTC';if(campus!=='UMNTC')return;const cacheKey=(code:string)=>campus+':'+term+':'+code;
  const cards=[...queue];queue.clear();
  for(let i=0;i<cards.length;i+=12){
   const group=cards.slice(i,i+12),codes=[...new Set(group.map(x=>x[1]))];
   const missing=codes.filter(code=>!contextCache.has(cacheKey(code))||Date.now()-contextCache.get(cacheKey(code))!.at>CACHE_MS);
   try{
    if(missing.length){
     const result=await client.batch(missing,term,campus);if(!Array.isArray(result))throw Error(result.error);
     for(const c of result)if(c.course.data)contextCache.set(cacheKey(c.course.data.code),{at:Date.now(),context:c});
    }
    const fitNeeded=codes.filter(code=>!fitCache.has(cacheKey(code))||Date.now()-fitCache.get(cacheKey(code))!.at>CACHE_MS)
      .map(code=>contextCache.get(cacheKey(code))?.context.course.data).filter((c):c is Course=>!!c);
    if(fitNeeded.length){
     const response=await client.fit(fitNeeded);
     if('error'in response)throw Error(response.error);
     for(const course of fitNeeded){
      const fit=response.items.find(x=>x.code===course.code)||{code:course.code,eligibility:{result:'unknown' as Truth,reason:'APAS fit unavailable'},matches:[]};
      fitCache.set(cacheKey(course.code),{at:Date.now(),fit,connected:response.connected,status:response.status});
     }
    }
    for(const[card,code]of group){
     const context=contextCache.get(cacheKey(code))?.context;
     const personal=fitCache.get(cacheKey(code));
     paint(card,code,term,campus,context,personal?.fit,personal?.connected??false,personal?.status);
    }
   }catch{
    for(const[card,code]of group)paint(card,code,term,campus,contextCache.get(cacheKey(code))?.context,fitCache.get(cacheKey(code))?.fit,fitCache.get(cacheKey(code))?.connected??false);
   }
  }
 }
 function enqueue(card:Element,code:string){queue.set(card,code);clearTimeout(timer);timer=setTimeout(()=>void flush(),120);}
 function paint(card:Element,code:string,term:string,campus:UMNCampus,c?:CourseContext,fit?:InlineFitItem,connected=false,status?:string){
  if(!card.isConnected||stopped)return;
  let old=hosts.get(card);
  if(old&&(!old.host.isConnected||old.code!==code||old.term!==term||old.campus!==campus)){removeInlineHost(old.host);hosts.delete(card);old=undefined;}
  if(old)return;
  const host=doc.createElement('smart-umn-insight');host.setAttribute('data-course',code);host.setAttribute('data-render-mode','inline');
  const shadow=host.attachShadow({mode:'open'}),style=doc.createElement('style');style.textContent=css;shadow.append(style);
  const mount=el(doc,'div');shadow.append(mount);let active:Tab|undefined;
  const render=()=>{
   mount.replaceChildren();const wrap=el(doc,'section','wrap'),top=el(doc,'div','topline');
   top.append(el(doc,'span','brand','smart umn'));
   if(!c){
    top.append(el(doc,'span','loading','Planner data unavailable'));
    const link=el(doc,'a','more-link','Open planner ↗');link.href=plannerUrl(code,term,campus);link.target='_blank';link.rel='noopener noreferrer';top.append(link);wrap.append(top);mount.append(wrap);return;
   }
   const planner=el(doc,'a','more-link','Full planner ↗');planner.href=plannerUrl(code,term,campus);planner.target='_blank';planner.rel='noopener noreferrer';
   const context=el(doc,'span','context',connected?(status||'APAS connected'):'APAS not connected');top.append(context,planner);wrap.append(top);
   const rail=el(doc,'div','rail'),toggle=(tab:Tab)=>()=>{active=active===tab?undefined:tab;render();};
   const yes=fit?.matches.find(m=>m.result==='yes'),route=fit?.routes?.find(m=>m.result==='yes'&&!m.strict);
   const degreeValue=!connected?'Connect UMN':yes?`✓ ${short(yes.label,34)}`:route?`◇ ${short(route.label,34)}`:fit?.eligibility.result==='no'?'Not eligible now':'Needs review';
   const degreeSub=!connected?'See personalized APAS fit + prerequisite status':yes?(fit?.eligibility.result==='yes'?'Prerequisites verified from completed courses':fit?.eligibility.reason||'Personalized APAS check'):route?'Candidate route · caps/conditions need review':fit?.eligibility.reason||'Personalized APAS check';
   const degreeTone=connected&&yes?'good':connected&&(route||fit?.eligibility.result==='unknown')?'warn':'neutral';
   const degree=insightButton(doc,'APAS fit',degreeValue,degreeSub,degreeTone,'Degree',active,toggle('Degree'));degree.setAttribute('data-insight','degree');rail.append(degree);
   if(c.grades.data){
    const g=c.grades.data,summary=gradeDistributionSummary(g.grades),value=summary.gpa!==undefined?`${summary.averageLetter||''} avg · ${summary.gpa.toFixed(2)} GPA`:'Historical grades';
    const sub=summary.mostCommon?`${summary.mostCommon} most common · ${summary.mostCommonPercent}% · ${g.totalStudents.toLocaleString()} students`:`${g.totalStudents.toLocaleString()} historical students`;
    const grades=insightButton(doc,'Course grades',value,sub,'neutral','Grades',active,toggle('Grades'));grades.setAttribute('data-insight','course-grades');grades.append(gradeSpark(doc,g.grades));rail.append(grades);
   }else{const unavailable=insightButton(doc,'Course grades','No verified history',`${UMN_CAMPUSES[c.course.data?.campus||campus].name} · historical source not substituted`,'neutral','Grades',active,toggle('Grades'));unavailable.setAttribute('data-insight','course-grades-unavailable');rail.append(unavailable);}
   const histories=currentInstructorGradeHistory(c);
   if(histories.length){
    const h=histories[0],summary=gradeDistributionSummary(h.grades),value=summary.gpa!==undefined?`${h.name} · ${summary.gpa.toFixed(2)} GPA`:h.name,sub=summary.mostCommon?`${summary.mostCommon} most common · ${summary.mostCommonPercent}% · ${h.students.toLocaleString()} students`:`${h.students.toLocaleString()} historical students`;
    const instructor=insightButton(doc,'Instructor history',short(value,40),sub,'neutral','Grades',active,toggle('Grades'));instructor.setAttribute('data-insight','instructor-grades');instructor.append(gradeSpark(doc,h.grades));rail.append(instructor);
   }
   const refs=newestReferences(c);
   {
    const signals=currentInstructorSignals(c),rated=signals.filter(s=>s.rating),lead=rated[0];
    const sources=el(doc,'div','insight neutral');sources.setAttribute('data-insight','references');sources.append(el(doc,'span','kicker','Student perspectives'),el(doc,'span','value',lead?`${lead.rating!.quality.toFixed(1)}/5 RMP · ${lead.instructor.name}`:'RMP & Reddit'),el(doc,'span','sub',lead?'Via GopherGrades · rating count unknown':`${refs.length} saved sources · discover more`));
    const links=el(doc,'div','source-links');
    for(const r of refs.slice(0,3)){const href=safeExternal(r.url);if(!href)continue;const who=referenceEntityLabel(c,r.entityType,r.entityId),label=r.source==='ratemyprofessor'?`RMP · ${who}`:r.source==='reddit'?`Reddit · ${who}`:`${r.source} · ${who}`;const a=el(doc,'a','source-link',`${short(label,28)} ↗`);a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
    if(!refs.some(r=>r.source==='reddit')){const a=el(doc,'a','source-link','Reddit · Course ↗');a.href=redditCourseSearch(code);a.target='_blank';a.rel='noopener noreferrer';links.append(a);}if(!refs.some(r=>r.source==='ratemyprofessor')&&signals[0]){const a=el(doc,'a','source-link','Find professor on RMP ↗');a.href=signals[0].searchUrl;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}const more=el(doc,'button','more-link','Review context');more.type='button';more.onclick=toggle('Community');links.append(more);sources.append(links);rail.append(sources);
   }
   wrap.append(rail);
   if(active){
    const body=el(doc,'div','body');body.setAttribute('data-active-tab',active);
    if(active==='Grades')renderGrades(doc,body,c,code,term);
    if(active==='Community')renderCommunity(doc,body,c,code,term);
    if(active==='Degree')renderDegree(doc,body,fit,connected,code,term,campus,client);
    wrap.append(body);
   }
   mount.append(wrap);
  };
  render();inlineMount(card,code).append(host);hosts.set(card,{host,code,term,campus});
 }
 const IO=win.IntersectionObserver;
 const observer=IO?new IO(entries=>entries.forEach(entry=>{if(entry.isIntersecting){const found=findCards(doc).find(c=>c.card===entry.target);if(found)enqueue(found.card,found.code);observer!.unobserve(entry.target);}}),{rootMargin:'1000px 0px',threshold:0.01}):undefined;
 function scan(){
  for(const[card,entry]of hosts)if(!card.isConnected){removeInlineHost(entry.host);hosts.delete(card);}
  const term=detectTerm(doc),campus=detectCampus(doc)||'UMNTC';if(campus!=='UMNTC'){for(const[card,entry]of hosts){removeInlineHost(entry.host);hosts.delete(card);}return;}
  for(const{card,code}of findCards(doc)){const old=hosts.get(card);if(old&&old.host.isConnected&&old.code===code&&old.term===term&&old.campus===campus)continue;if(observer)observer.observe(card);else enqueue(card,code);}
 }
 function refreshPersonalization(){
  fitCache.clear();
  for(const[card,entry]of hosts){removeInlineHost(entry.host);hosts.delete(card);}
  scan();
 }
 const mo=new win.MutationObserver(records=>{if(records.every(r=>(r.target as Element).closest?.('smart-umn-insight')))return;scan();});
 mo.observe(doc.body,{subtree:true,childList:true});win.addEventListener('popstate',scan);scan();
 return{scan,refreshPersonalization,disconnect(){stopped=true;mo.disconnect();observer?.disconnect();clearTimeout(timer);win.removeEventListener('popstate',scan);}};
}
