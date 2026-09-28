/** Accessibility acceptance: fresh profile, synthetic APAS fixture only, axe-core plus keyboard/reflow checks. */
import fs from'node:fs/promises';import path from'node:path';import os from'node:os';
import{chromium,type Page}from'playwright-core';
const root=process.cwd(),base=(process.env.PUBLIC_ORIGIN||'http://127.0.0.1:4317').replace(/\/$/,'');
const executablePath=process.env.SMART_UMN_CHROMIUM;if(!executablePath)throw Error('Set SMART_UMN_CHROMIUM to a Chromium executable with unpacked-extension support');
const fixture=path.join(root,'tests/fixtures/apas-acceptance.html');if(!(await fs.readFile(fixture,'utf8')).includes('Smart UMN Synthetic BA'))throw Error('Only the synthetic acceptance fixture may be imported');
const axeSource=await fs.readFile(path.join(root,'node_modules/axe-core/axe.min.js'),'utf8');
const TAGS=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'];
const findings:string[]=[],report:any={checkedAt:new Date().toISOString(),origin:base,axe:[],keyboard:{},extension:{}};
const fail=(msg:string)=>{findings.push(msg);console.log('FAIL',msg);};
async function axe(page:Page,label:string,include?:string){
 if(!await page.evaluate(()=>'axe' in window))await page.evaluate(axeSource);
 const r:any=await page.evaluate(([sel,tags])=>(window as any).axe.run(sel?{include:[sel]}:document,{runOnly:{type:'tag',values:tags}}),[include,TAGS] as const);
 report.axe.push({label,violations:r.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))});
 for(const v of r.violations)fail(`${label}: axe ${v.id} (${v.impact}) on ${v.nodes.slice(0,3).map((n:any)=>n.target.join(' ')).join(', ')}`);
 console.log(`${r.violations.length?'FAIL':'PASS'} axe ${label}: ${r.violations.length} violations, ${r.passes.length} rules passed`);
}
const focusInfo=(page:Page)=>page.evaluate(()=>{let e:Element|null=document.activeElement;while(e?.shadowRoot?.activeElement)e=e.shadowRoot.activeElement;if(!e||e===document.body)return null;const s=getComputedStyle(e);
 const lum=(c:string)=>{const m=c.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;});return .2126*m[0]+.7152*m[1]+.0722*m[2];};
 let bg='rgb(255,255,255)';for(let p:Element|null=e.parentElement;p;p=p.parentElement){const c=getComputedStyle(p).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)){bg=c;break;}}
 const ring=s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2?s.outlineColor:null;const [a,b]=ring?[lum(ring),lum(bg)]:[0,0];
 return{tag:e.tagName.toLowerCase(),name:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,50),ring,contrast:ring?(Math.max(a,b)+.05)/(Math.min(a,b)+.05):0};});
async function tabCycle(page:Page,label:string,max=80){
 await page.evaluate(()=>(document.activeElement as HTMLElement|null)?.blur());const seen:string[]=[];let bodyHits=0;
 for(let i=0;i<max;i++){await page.keyboard.press('Tab');const f=await focusInfo(page);if(!f){if(++bodyHits>1)break;continue;}
  const key=f.tag+':'+f.name;if(seen[0]===key&&seen.length>1)break;seen.push(key);
  if(!f.ring)fail(`${label}: focused ${key} has no visible outline`);else if(f.contrast<3)fail(`${label}: focus ring on ${key} is ${f.contrast.toFixed(2)}:1 (<3:1)`);}
 report.keyboard[label]=seen;console.log(`PASS keyboard ${label}: ${seen.length} focus stops`);return seen;
}
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'smart-umn-a11y-'));
const ext=path.join(root,'dist/extension');
const context=await chromium.launchPersistentContext(profile,{headless:process.env.HEADLESS!=='false',executablePath,viewport:{width:1280,height:900},reducedMotion:'reduce',args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
try{
 const page=await context.newPage();const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===base)errors.push(`HTTP ${r.status()} ${r.url()}`);});
 for(const width of[1280,375,320]){
  await page.setViewportSize({width,height:900});
  for(const p of['/privacy.html','/support.html','/']){await page.goto(base+p);await page.waitForLoadState('networkidle');await axe(page,`${p} @${width}`);
   const sw=await page.evaluate(()=>document.documentElement.scrollWidth);if(sw>width)fail(`${p} @${width}: horizontal overflow ${sw}px`);}
 }
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/');await page.getByRole('button',{name:'Connect APAS',exact:true}).waitFor();
 await tabCycle(page,'home');
 // Dialog: focus moves in, Escape restores to the trigger.
 await page.getByRole('button',{name:'Connect APAS',exact:true}).focus();await page.keyboard.press('Enter');await page.locator('dialog[open]').waitFor();
 if(!await page.evaluate(()=>!!document.activeElement?.closest('dialog[open]')))fail('dialog did not receive focus');
 await axe(page,'connect dialog');await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'detached'});
 if(await page.evaluate(()=>document.activeElement?.id)!=='connection')fail('Escape did not restore focus to the Connect APAS trigger');
 // Import via the real file control, then focus must land on a real control, not <body>.
 await page.getByRole('button',{name:'Connect APAS',exact:true}).click();await page.getByText('Advanced / recovery',{exact:true}).click();await page.getByLabel('Import local APAS HTML').setInputFiles(fixture);
 await page.getByRole('heading',{name:'Smart UMN Synthetic BA',exact:true}).waitFor();
 if(await page.evaluate(()=>document.activeElement?.id)!=='connection')fail('focus was lost after APAS import');
 const status=await page.locator('#toast[role=status][aria-live=polite]').innerText();if(!/imported/i.test(status))fail('import result was not announced through the status region');
 await axe(page,'imported plan');await tabCycle(page,'plan');
 await page.getByRole('button',{name:'Build my plan',exact:true}).click();await page.locator('.schedule').first().waitFor({timeout:90000});
 const week=page.locator('.week').first();if(await week.count()){await week.focus();if(await page.evaluate(()=>document.activeElement?.classList.contains('week'))!==true)fail('week grid is not keyboard focusable');}
 await axe(page,'built schedule @1280');await page.setViewportSize({width:375,height:900});await axe(page,'built schedule @375');
 const sticky=await page.evaluate(()=>{const top=document.querySelector('.topbar')!.getBoundingClientRect().bottom;const pad=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);return{top,pad};});
 if(sticky.pad<sticky.top)fail(`scroll-padding-top ${sticky.pad}px is smaller than the sticky topbar ${sticky.top}px`);
 await page.setViewportSize({width:1280,height:900});await page.getByRole('button',{name:'Explore',exact:true}).click();await page.waitForLoadState('networkidle');await axe(page,'explore');
 if(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length))fail('animations run under prefers-reduced-motion');
 report.web={consoleErrors:errors};if(errors.length)fail('console/network errors: '+errors.join(' | '));
 // Extension inside real Schedule Builder (public page, no APAS profile needed for the rail).
 const sb=await context.newPage();const sbErrors:string[]=[];sb.on('console',m=>{if(m.type()==='error'&&/smart|umn-insight/i.test(m.text()))sbErrors.push(m.text());});
 await sb.goto('https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/');const host=sb.locator('smart-umn-insight').first();await host.waitFor({timeout:60000});await sb.locator('smart-umn-insight button.insight').first().waitFor({timeout:60000});
 await sb.waitForTimeout(1500);await axe(sb,'Schedule Builder inline insight','smart-umn-insight');
 const btn=sb.locator('smart-umn-insight button.insight').first();await btn.focus();const tab=await btn.getAttribute('data-tab');await sb.keyboard.press('Enter');
 const after=await sb.evaluate(()=>{const h=document.querySelector('smart-umn-insight')!;const a=h.shadowRoot!.activeElement as HTMLElement|null;return a?{tab:a.dataset.tab,expanded:a.getAttribute('aria-expanded')}:null;});
 if(after?.tab!==tab||after?.expanded!=='true')fail(`extension insight toggle lost keyboard focus (${JSON.stringify(after)})`);
 const f=await focusInfo(sb);if(!f?.ring||f.contrast<3)fail(`extension focus ring insufficient (${JSON.stringify(f)})`);
 const links=await sb.evaluate(()=>[...document.querySelector('smart-umn-insight')!.shadowRoot!.querySelectorAll('a')].map(a=>a.href));if(links.some(h=>/localhost|127\.0\.0\.1/.test(h))&&!/127\.0\.0\.1|localhost/.test(base))fail('production extension links to localhost');
 report.extension={focusRetained:after,links:links.slice(0,4),consoleErrors:sbErrors};if(sbErrors.length)fail('extension console errors: '+sbErrors.join(' | '));
}finally{await context.close();await fs.rm(profile,{recursive:true,force:true});}
report.findings=findings;if(process.env.A11Y_REPORT)await fs.writeFile(process.env.A11Y_REPORT,JSON.stringify(report,null,2)+'\n');
console.log(findings.length?`\n${findings.length} accessibility finding(s)`:'\nAccessibility acceptance passed');if(findings.length)process.exitCode=1;
