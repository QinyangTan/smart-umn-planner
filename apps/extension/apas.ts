import{parseAPAS,discoverAuditLinks,discoverAuditChoices,selectLatestAudit}from'../../packages/apas-parser/index.ts';
const send=(m:unknown)=>chrome.runtime.sendMessage(m);const root='https://umn.uachieve.com';
async function getDocument(href:string){const u=new URL(href,location.href);if(u.origin!==root||!u.pathname.startsWith('/selfservice/audit/'))throw Error('Invalid first-party APAS path');const r=await fetch(u.href,{credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('UMN session expired — reconnect');const html=await r.text();if(html.length>5_000_000)throw Error('Audit size changed');return new DOMParser().parseFromString(html,'text/html');}
async function sync(){const state=await send({type:'GET_SYNC'});if(!state?.active)return;
 try{
 let audit=document;
 if(!document.querySelector('.requirement')){
 const links=discoverAuditLinks(document,location.href);if(links.length){const choices=discoverAuditChoices(document,location.href);if(choices.length)await send({type:'APAS_CHOICES',programs:choices.map(c=>c.title)});location.assign(selectLatestAudit(document,location.href,state.preferredProgram));return;
 }
 const link=[...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find(a=>a.origin===root&&/\/selfservice\/audit\/(list|manage)\.html$/.test(a.pathname));
 const key='smart-umn-discovery-hops';const hops=Number(sessionStorage.getItem(key)||0);if(link&&hops<3){sessionStorage.setItem(key,String(hops+1));location.assign(link.href);return;}
 throw Error('No existing audit found automatically. Complete UMN sign-in or request an audit in this official tab; sync will resume.');
 }
 let history:Document|undefined;const h=document.querySelector<HTMLAnchorElement>('a[href*="/audit/listcourses.html"]');if(h){try{history=await getDocument(h.href);}catch{}}
 let profile;try{profile=parseAPAS(audit,history);}catch(error){const printer=document.querySelector<HTMLAnchorElement>('a[href*="printerFriendly=true"]');if(!printer)throw error;audit=await getDocument(printer.href);profile=parseAPAS(audit,history);}
 if(!history)profile.warnings.push('Course History not loaded; audit course rows used');
 const response=await send({type:'APAS_RESULT',profile});if(response?.error)throw Error(response.error);
 }catch(error){await send({type:'APAS_ERROR',message:error instanceof Error?error.message:'APAS parsing failed'});}}
void sync();
// Covers an already-open first-party landing page when service-worker tab ownership
// was persisted just after the document reached idle. Bounded retry, no polling loop.
setTimeout(()=>void sync(),1200);
