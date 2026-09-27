import {APAS_CAMPUS_DIGITS,courseCode,finite,parseCampusCourseCode,unknownRule} from '../schemas/index.ts';
import type {StudentAcademicProfile,StudentCourse,DegreeRequirement,RequirementRule,AcademicProgramRoute} from '../schemas/index.ts';
export const PARSER_VERSION='0.4.3';
const text=(n:Element|null):string=>{if(!n)return'';const clone=n.cloneNode(true) as Element;clone.querySelectorAll('br').forEach(b=>b.replaceWith(' '));return(clone.textContent||'').replace(/\s+/g,' ').trim();};
const num=(n:Element|null)=>finite(text(n));
function status(el:Element):DegreeRequirement['status'] {const s=el.matches('.requirement')?el.className:el.querySelector('.subreqPretext .status')?.className||el.className;return /Status_OK/.test(s)?'complete':/Status_IP/.test(s)?'in_progress':/Status_NO\b/.test(s)?'incomplete':/Status_NONE/.test(s)?'informational':'unknown';}
function normalizeTerm(t:string):string{const m=/^(SP|SU|F)\s*(\d{2})$/i.exec(t);return m?`${({SP:'Spring',SU:'Summer',F:'Fall'} as Record<string,string>)[m[1].toUpperCase()]} 20${m[2]}`:t;}
function programKind(name:string):NonNullable<StudentAcademicProfile['program']['kind']>{const n=name.trim();if(!n)return'unknown';if(/\bwhat[- ]?if\b/i.test(n))return'what_if';if(/\bminor\b/i.test(n))return'minor';if(/\bcertificate\b/i.test(n))return'certificate';if(/\bmajor\b/i.test(n))return'major';return'degree';}
function namespaceRequirement(r:DegreeRequirement,prefix:string):DegreeRequirement{return{...r,id:`${prefix}::${r.id}`,label:`${prefix} · ${r.label}`,rawMetadata:{...r.rawMetadata,originalLabel:r.label},children:r.children.map(c=>namespaceRequirement(c,prefix))};}
export function asAdditionalProgram(profile:StudentAcademicProfile):AcademicProgramRoute{return{program:profile.program,requirements:profile.requirements.map(r=>namespaceRequirement(r,profile.program.name)),syncedAt:profile.syncedAt,parserVersion:profile.parserVersion,warnings:profile.warnings,provenance:profile.provenance};}
export function mergeProgramAudit(current:StudentAcademicProfile|undefined,incoming:StudentAcademicProfile):StudentAcademicProfile{if(!current)return incoming;if(current.program.name===incoming.program.name)return{...incoming,additionalPrograms:current.additionalPrograms||incoming.additionalPrograms};const byName=new Map((current.additionalPrograms||[]).map(p=>[p.program.name,p]));byName.set(incoming.program.name,asAdditionalProgram(incoming));return{...current,additionalPrograms:[...byName.values()],syncedAt:new Date().toISOString()};}
function studentCourse(code:string,title:string,credits:string,term:string,grade:string,state:string,transferSource?:string):StudentCourse|null {let parsed;try{parsed=parseCampusCourseCode(code);}catch{return null;}const ip=/in.progress|\bip\b/i.test(state), future=/planned|future/i.test(state);const failed=/^(F|N|W|I|NR)$/.test(grade);return{courseCode:parsed.code,campus:parsed.campus,subject:parsed.subject,number:parsed.catalogNumber,title,credits:finite(credits),term:normalizeTerm(term),grade,status:ip?'in_progress':future?'future':failed?'unknown':transferSource||/^T/.test(grade)?'transfer':/complete/i.test(state)||/^[ABCD][+-]?$|^[SP]$/.test(grade)?'completed':'unknown',...(transferSource?{transferSource}:{})};}
export function parseHistory(doc:Document):StudentCourse[] {
 const tables=[...doc.querySelectorAll('table')];const table=tables.find(t=>/Transfer Institution/.test(text(t.querySelector('thead'))));if(!table)throw new Error('Course History schema unrecognized');
 const headers=[...table.querySelectorAll('thead th')].map(text);const ix=(s:string)=>headers.findIndex(h=>h.toLowerCase()===s.toLowerCase());
 const required=['Term','Course','Credits','Grade','Title','Status'];if(required.some(s=>ix(s)<0))throw new Error('Course History columns changed');
 return [...table.querySelectorAll('tbody > tr')].map(tr=>{const cells=[...tr.children];const get=(s:string)=>text(cells[ix(s)]||null);const state=cells[ix('Status')];return studentCourse(get('Course'),get('Title'),get('Credits'),get('Term'),get('Grade'),get('Status')+' '+[...(state?.querySelectorAll('[title],[alt]')||[])].map(e=>e.getAttribute('title')||e.getAttribute('alt')).join(' '),get('Transfer Institution/Course')||undefined);}).filter((c):c is StudentCourse=>!!c);
}
function taken(root:Element):StudentCourse[]{return [...root.querySelectorAll('tr.takenCourse')].map(tr=>studentCourse(text(tr.querySelector('td.course')),text(tr.querySelector('.descLine,.description')),text(tr.querySelector('.credit')),text(tr.querySelector('.term')),text(tr.querySelector('.grade')),tr.className+' '+text(tr.querySelector('.ccode')))).filter((c):c is StudentCourse=>!!c);}
function courseRule(el:Element):RequirementRule{const raw=(el.getAttribute('department')||'').trim(),m=/^([13456])([A-Z]{2,8})$/i.exec(raw);if(!m)return unknownRule(text(el),'Unrecognized UMN campus/designator');const campus=APAS_CAMPUS_DIGITS[m[1]],dep=m[2].toUpperCase(),number=(el.getAttribute('number')||'').trim().toUpperCase();if(/^\d{1,4}[A-Z]?$/.test(number))return{type:'course',code:`${dep} ${number}`,campus};if(/^\d[X*]{3}$/.test(number))return{type:'range',subject:dep,min:Number(number[0])*1000,max:Number(number[0])*1000+999,campus};return unknownRule(text(el),'Unsupported wildcard/range');}
function direct(el:Element,sel:string){return[...el.querySelectorAll(sel)].find(e=>e.closest('.subrequirement,.requirement')===el)||null;}
function selectableRule(el:Element):RequirementRule|undefined{
 const selected=[...el.querySelectorAll('.selectcourses .course[department][number]')].filter(n=>n.closest('.subrequirement,.requirement')===el).map(courseRule).filter((r):r is Exclude<RequirementRule,{type:'unknown'}>=>r.type!=='unknown');
 if(!selected.length)return;
 let rule:RequirementRule=selected.length===1?selected[0]:{type:'anyOf',rules:selected};
 const excluded=[...el.querySelectorAll('.notcourses .course[department][number]')].filter(n=>n.closest('.subrequirement,.requirement')===el).map(courseRule).filter(r=>r.type!=='unknown');if(excluded.length)rule={type:'exclude',rule,excluded};return rule;
}
function scopedDesignatorConstraint(label:string):boolean{return /\bof\s+the(?:\s+\d+(?:\.\d+)?)?\s+credits?\b[\s\S]*\b(?:required|needed)\b[\s\S]*\bmust\s+have\s+(?:an?\s+)?[A-Z]{2,8}\s+designator\b/i.test(label);}
function deterministicLabelRule(label:string):RequirementRule|undefined{
 const level=/^(\d)xxx\/(\d)xxx-level\s+([A-Z]{2,8})\s+coursework$/i.exec(label.trim());if(level){const subject=level[3].toUpperCase();return{type:'anyOf',rules:[{type:'range',subject,min:Number(level[1])*1000,max:Number(level[1])*1000+999,campus:'UMNTC'},{type:'range',subject,min:Number(level[2])*1000,max:Number(level[2])*1000+999,campus:'UMNTC'}]};}
 if(scopedDesignatorConstraint(label))return;
 const designator=/\b(\d+(?:\.\d+)?)\s+(?:credits?\s+)?must\s+have\s+(?:an?\s+)?([A-Z]{2,8})\s+designator\b/i.exec(label);if(designator)return{type:'credits',minimum:Number(designator[1]),rule:{type:'range',subject:designator[2].toUpperCase(),min:0,max:9999,campus:'UMNTC'}};
 return;
}
function parseRule(el:Element,label:string):RequirementRule {
 if(scopedDesignatorConstraint(label)&&!selectableRule(el))return unknownRule(label,'Designator-credit constraint is scoped to another requirement and cannot independently authorize courses');
 const base=selectableRule(el)||deterministicLabelRule(label);if(!base)return unknownRule(label,'No explicit selectable course rule');
 // Explicit pools with caps/exceptions are exposed as candidate routes separately,
 // but are not promoted to completion rules until their quantitative semantics are proven.
 const unresolvedCompound=/\b(note:|combined|permission|approval|0-2|up to|not count more|no more than)\b/i.test(label)||(/\bexcept\b/i.test(label)&&base.type!=='exclude');
 if(unresolvedCompound)return unknownRule(label,'Compound cap or exception needs a richer rule');
 let rule:RequirementRule=base;const hours=finite(el.getAttribute('rqdhours')),requiredCount=finite(el.getAttribute('rqdcount'))||finite(el.getAttribute('rqdsubreq')),needsCount=num(direct(el,'.reqNeeds .count,.subreqNeeds .count')),max=finite(el.getAttribute('maxhours'));
 if(rule.type==='credits'||rule.type==='count'||rule.type==='gpa')return rule;
 if(hours&&hours>0)rule={type:'credits',minimum:hours,...(max!==undefined&&max<999?{maximum:max}:{}),rule};
 else if(requiredCount&&requiredCount>0)rule={type:'count',minimum:requiredCount,rule};
 else if(needsCount&&needsCount>0)rule={type:'count',minimum:needsCount,rule};
 else if(!deterministicLabelRule(label))return unknownRule(label,'Selectable list exists, but count/credit semantics are not proven');
 const gpa=finite(el.getAttribute('rqdgpa'));if(gpa&&gpa>0)rule={type:'gpa',minimum:gpa,rule};return rule;
}
function requirement(el:Element,index:string):DegreeRequirement {
 const sub=el.matches('.subrequirement');const label=text(el.querySelector(sub?'.subreqTitle':'.reqTitle'))||text(el.querySelector(sub?'.subreqBody':'.reqText'))||el.getAttribute('rname')||'Untitled requirement';
 const children=[...el.querySelectorAll('.subrequirement')].filter(e=>e.parentElement?.closest('.subrequirement,.requirement')===el).map((e,i)=>requirement(e,`${index}.${i}`));
 const ownCandidate=selectableRule(el)||deterministicLabelRule(label),childCandidates=children.map(c=>c.candidateRule||(c.rule.type!=='unknown'?c.rule:undefined)).filter((r):r is RequirementRule=>!!r),candidateRule=ownCandidate||(childCandidates.length===1?childCandidates[0]:childCandidates.length?{type:'anyOf',rules:childCandidates} as RequirementRule:undefined);
 const rawMetadata:Record<string,unknown>={attributes:Object.fromEntries([...el.attributes].filter(a=>!/^on|href|src/i.test(a.name)).map(a=>[a.name,a.value])),sourceText:label,selectableCourses:[...el.querySelectorAll('.selectcourses .course[department][number]')].map(e=>({department:e.getAttribute('department'),number:e.getAttribute('number')})),candidateRoute:!!candidateRule};
 const requiredCount=finite(el.getAttribute('rqdcount'))||finite(el.getAttribute('rqdsubreq'));
 return{id:index,code:el.getAttribute(sub?'pseudo':'rname')||undefined,label,status:status(el),requiredCredits:finite(el.getAttribute('rqdhours')),appliedCredits:num(direct(el,'.reqEarned .hours,.subreqEarned .hours')),inProgressCredits:num(direct(el,'.reqIpDetail .hours,.subreqIpHours .hours')),remainingCredits:num(direct(el,'.reqNeeds .hours,.subreqNeeds .hours')),requiredCount,appliedCount:num(direct(el,'.reqEarned .count,.subreqEarned .count')),inProgressCount:num(direct(el,'.reqIpDetail .count,.subreqIpHours .count')),remainingCount:num(direct(el,'.reqNeeds .count,.subreqNeeds .count')),requiredGpa:finite(el.getAttribute('rqdgpa')),coursesUsed:[...new Set(taken(el).map(c=>c.courseCode!))],children,rule:parseRule(el,label),...(candidateRule?{candidateRule}:{}),rawMetadata};
}
export function parseAPAS(doc:Document,history?:Document):StudentAcademicProfile {
 // UMN embeds a second copy of #audit for a responsive layout. Never count both.
 const root=doc.querySelector('#audit')||doc.body;
 if(!root.querySelector('.requirement'))throw new Error('APAS schema unrecognized; no semantic requirements');
 const requirements=[...root.querySelectorAll('.requirement')].filter(e=>!e.parentElement?.closest('.requirement')).map((e,i)=>requirement(e,`r${i}`));
 const h=doc.querySelector('.card-header');const heading=text(h?.querySelector('h2')||doc.querySelector('[data-program]'));
 const info=text(h||doc.querySelector('[data-program]'));let warnings:string[]=[];
 let courses=taken(root);if(history){try{courses=parseHistory(history);}catch{warnings.push('Course History unavailable or changed; using audit rows');}}
 courses=[...new Map(courses.map(c=>[`${c.campus}|${c.courseCode}|${c.term}|${c.grade}`,c])).values()];
 // Degree totals must be identified by semantic APAS category or meaning, never by one program's requirement code.
 const totals=requirements.filter(r=>{const attrs=(r.rawMetadata.attributes||{}) as Record<string,unknown>,cls=String(attrs.class||'');return /(?:^|\s)category_Total_Hours(?:\s|$)/.test(cls)||/^(?:minimum\s+(?:total\s+)?degree\s+(?:credits|hours)|(?:minimum\s+)?(?:total\s+)?credits?\s+(?:required\s+)?for\s+(?:the\s+)?degree|total\s+degree\s+credits?)(?:\s*[:.\-]\s*\d+)?$/i.test(r.label.trim());});
 const total=totals.length===1?totals[0]:undefined;
 if(!total)warnings.push('Degree credit total not uniquely recognized; consult the official audit');
 if(!heading)warnings.push('Program heading not recognized');
 const campuses=[...new Set(courses.map(c=>c.campus).filter(Boolean))];const programCampus=campuses.length===1?campuses[0]:undefined;
 return{program:{name:heading||'Program not recognized',kind:programKind(heading||''),campus:programCampus,catalogYear:/Catalog Year\s+((?:Fall|Spring|Summer)\s+\d{4}|\d{4})/i.exec(info)?.[1],expectedGraduation:/Expected Grad Term\s+((?:Spr|Spring|Fall|Summer)\s+\d{4})/i.exec(info)?.[1]},degreeCredits:{required:total?.requiredCredits,completed:total?.appliedCredits,inProgress:total?.inProgressCredits,remaining:total?.remainingCredits},completedCourses:courses.filter(c=>c.status==='completed'),inProgressCourses:courses.filter(c=>c.status==='in_progress'),transferCourses:courses.filter(c=>c.status==='transfer'),requirements,syncedAt:new Date().toISOString(),parserVersion:PARSER_VERSION,warnings,provenance:{source:'umn-apas',retrievedAt:new Date().toISOString(),period:/Prepared On\s+(\d{2}\/\d{2}\/\d{4})/.exec(info)?.[1]||'Audit period not recognized'}};
}
export function discoverAuditLinks(doc:Document,base:string):string[]{return [...new Set([...doc.querySelectorAll('a[href]')].map(a=>{try{const u=new URL(a.getAttribute('href')!,base);return u.origin==='https://umn.uachieve.com'&&u.pathname==='/selfservice/audit/read.html'&&u.searchParams.has('id')?u.href:'';}catch{return'';}}).filter(Boolean))];}
export class UMNAPASProvider {parse=parseAPAS;}
export type AuditChoice={href:string;title:string;created?:string;time:number};
export function discoverAuditChoices(doc:Document,base:string):AuditChoice[]{const links=discoverAuditLinks(doc,base);const entries=links.map(href=>{const a=[...doc.querySelectorAll<HTMLAnchorElement>('a[href]')].find(a=>new URL(a.getAttribute('href')!,base).href===href);const row=a?.closest('tr'),table=row?.closest('table'),headers=[...(table?.querySelectorAll('thead th')||[])].map(text),cells=[...(row?.children||[])],title=text(cells[headers.findIndex(h=>h==='Title')]||null),created=text(cells[headers.findIndex(h=>h==='Created')]||null);return{href,title,created:created||undefined,time:Date.parse(created)};}).filter(e=>e.title);const latest=new Map<string,AuditChoice>();for(const e of entries){const old=latest.get(e.title);if(!old||Number.isFinite(e.time)&&(!Number.isFinite(old.time)||e.time>old.time))latest.set(e.title,e);}const rank=(title:string)=>({degree:0,major:1,minor:2,certificate:3,what_if:4,unknown:5} as const)[programKind(title)];return[...latest.values()].sort((a,b)=>rank(a.title)-rank(b.title)||(Number.isFinite(b.time)?b.time:0)-(Number.isFinite(a.time)?a.time:0)||a.title.localeCompare(b.title));}
export function selectLatestAudit(doc:Document,base:string,preferredProgram?:string):string {
 const entries=discoverAuditChoices(doc,base);if(!entries.length)throw Error('No audit links found');let eligible=preferredProgram?entries.filter(e=>e.title===preferredProgram):entries;
 if(!preferredProgram&&entries.length>1){const primary=entries.filter(e=>['degree','major'].includes(programKind(e.title)));if(new Set(primary.map(e=>e.title)).size===1)eligible=primary;else throw Error('Multiple APAS program audits found. Choose the program you want to sync.');}
 if(!eligible.length)throw Error('Requested APAS program is absent from the completed audit list.');if(eligible.length===1)return eligible[0].href;if(eligible.some(e=>!Number.isFinite(e.time)))throw Error('Audit dates not recognized; choose the intended program audit once.');eligible.sort((a,b)=>b.time-a.time);if(eligible[0].time===eligible[1].time)throw Error('Audit dates are tied; choose the intended program audit once.');return eligible[0].href;
}
