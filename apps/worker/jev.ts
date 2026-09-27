import{execFile}from'node:child_process';import{promisify}from'node:util';import{readFileSync}from'node:fs';import{fileURLToPath}from'node:url';
const run=promisify(execFile);
export class JevBrowser {
 binary:string;session:string;tab?:string;
 constructor(binary=process.env.CHROME_USE_BIN||'chrome-use',session='smart-umn-community'){this.binary=binary;this.session=session;}
 async command(args:string[]){const{stdout}=await run(this.binary,[...args,'--session',this.session,'--json'],{timeout:20000,maxBuffer:2_000_000});const r=JSON.parse(stdout);if(r.success===false)throw Error(r.error||'Browser command failed');return r.data??r;}
 async open(url:string){if(!this.tab){const value=await this.command(['tab','new',url]);this.tab=String(value.tabId||value.id||value.tab||'');if(!this.tab)throw Error('Browser did not return an owned tab');}else await this.command(['open',url,'--tab',this.tab]);}
 async evaluate(js:string){if(!this.tab)throw Error('No owned collector tab');return this.command(['eval','-b',Buffer.from(js).toString('base64'),'--tab',this.tab]);}
 async snapshot(){const js=readFileSync(fileURLToPath(new URL('../../packages/community/upstream/snapshot.js',import.meta.url)),'utf8');return this.evaluate(js);}
 async guardedClick(node:number,guard:unknown){return this.evaluate(`(()=>{const c=window.__jevFast,n=c?.nodes.get(${JSON.stringify(node)});if(!n||JSON.stringify(c.guard(n))!==${JSON.stringify(JSON.stringify(guard))})throw Error('Stale JEV target');if(n.tagName!=='A'||new URL(n.href).origin!==location.origin)throw Error('Only same-origin public links permitted');n.click();return true;})()`);}
 async discussionDOM(){return this.evaluate(`(()=>({url:location.href,blocked:/captcha|verify you are human|blocked by network security|log in to continue|access denied/i.test(document.body.innerText),title:document.querySelector('h1')?.innerText||'',excerpt:(document.querySelector('[data-post-click-location="text-body"],.usertext-body,article p')?.innerText||'').slice(0,280),publishedAt:document.querySelector('time')?.getAttribute('datetime')}))()`);}
}
