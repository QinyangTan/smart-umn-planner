/** Reviewer acceptance: follow README "Try it in 3 minutes" literally against production.
 * Fresh browser profile, the extension ZIP downloaded from the live site, the synthetic demo student only. */
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{chromium,type Page}from'playwright-core';
const base=process.env.PUBLIC_ORIGIN||'https://smartumn.qinyangtan.com';
const executablePath=process.env.SMART_UMN_CHROMIUM;
if(!executablePath)throw Error('Set SMART_UMN_CHROMIUM to a Chromium executable with unpacked-extension support');
const out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'';
const checks:{step:string;check:string;ok:boolean;detail?:string}[]=[];const record:Record<string,unknown>={};
const check=(step:string,name:string,ok:boolean,detail?:string)=>{checks.push({step,check:name,ok,detail});console.log(`${ok?'PASS':'FAIL'} ${step} · ${name}${detail?` — ${detail}`:''}`);};
// Text of the page including open shadow roots (the extension renders inside Shadow DOM).
const deepText=(page:Page)=>page.evaluate(()=>{const walk=(n:Node):string=>{let s='';if(n.nodeType===3)return n.textContent||'';const el=n as Element;if(el.shadowRoot)s+=walk(el.shadowRoot)+' ';for(const c of Array.from(n.childNodes))s+=walk(c);return s;};return walk(document.body).replace(/\s+/g,' ');});

const work=await fs.mkdtemp(path.join(os.tmpdir(),'smart-umn-judge-'));
const health=await(await fetch(`${base}/api/health`)).json();record.version=health.version;
const zip=Buffer.from(await(await fetch(`${base}/smart-umn-extension.zip`)).arrayBuffer());record.zipSha256=createHash('sha256').update(zip).digest('hex');
await fs.writeFile(path.join(work,'ext.zip'),zip);const extDir=path.join(work,'smart-umn-extension');execFileSync('unzip',['-q',path.join(work,'ext.zip'),'-d',extDir]);
const manifest=JSON.parse(await fs.readFile(path.join(extDir,'manifest.json'),'utf8'));
check('1 install','downloaded ZIP unzips to a folder with manifest.json at its root',!!manifest.manifest_version);
check('1 install','extension version matches the live site',manifest.version===health.version,`${manifest.version} vs ${health.version}`);

const context=await chromium.launchPersistentContext(path.join(work,'profile'),{headless:process.env.HEADLESS!=='false',executablePath,viewport:{width:1280,height:900},args:[`--disable-extensions-except=${extDir}`,`--load-extension=${extDir}`]});
const consoleErrors:string[]=[];
context.on('page',p=>p.on('console',m=>{if(m.type()==='error'&&p.url().startsWith(base))consoleErrors.push(m.text().slice(0,200));}));
try{
 const page=await context.newPage();page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,200));});
 // Step 2 — demo student
 let t0=Date.now();await page.goto(`${base}/?demo=1`);await page.locator('.demo-banner').waitFor({timeout:30000});record.demoLoadMs=Date.now()-t0;
 const home=await page.locator('body').innerText();
 check('2 demo','gold Demo student banner',/Demo student/.test(home));
 const credits=/(\d+)\s*credits left/i.exec(home)?.[1]||/credits left\s*(\d+)/i.exec(home)?.[1];record.creditsLeft=credits;
 check('2 demo','README "54 credits left"',credits==='54',`page shows ${credits}`);
 check('2 demo','no out-of-date extension notice',!/extension is out of date/.test(home));
 check('2 demo','review items are shown instead of decided',/review/i.test(home));
 // Step 3 — build a plan
 t0=Date.now();await page.getByRole('button',{name:'Build my plan',exact:true}).click();
 await page.locator('.schedule, .plan-diagnosis').first().waitFor({timeout:120000});record.buildMs=Date.now()-t0;
 const plan=await page.locator('body').innerText();
 const options=/Option\s*1\s*of\s*(\d+)/.exec(plan)?.[1];record.options=Number(options||0);
 check('3 plan','conflict-free options produced',Number(options)>0,`${options||0} options in ${record.buildMs} ms`);
 check('3 plan','"Why this plan?" is explained',/Why this plan\?/.test(plan));
 check('3 plan','class numbers shown',/\b\d{5}\b/.test(plan));
 const first=[...new Set(plan.slice(plan.indexOf('Option 1')).match(/\b[A-Z]{2,4} \d{4}[A-Z]?\b/g)||[])].slice(0,6);record.firstOption=first;
 // Step 4 — Explore CSCI 5302
 await page.getByRole('button',{name:'Explore',exact:true}).click();const q=page.locator('#query');await q.fill('CSCI 5302');await q.press('Enter');
 await page.getByText('Optional course experience evidence').first().waitFor({timeout:60000});await page.getByText('Optional course experience evidence').first().click();
 await page.waitForTimeout(1500);const ex=await page.locator('body').innerText();
 check('4 explore','CSCI 5302 opens with grade history',/CSCI 5302/.test(ex)&&/(A-range|grade|GPA)/i.test(ex));
 // Step 5 — inside Schedule Builder
 const sb=async(url:string)=>{const p=await context.newPage();p.on('console',m=>{if(m.type()==='error'&&/smart.?umn/i.test(m.text()))consoleErrors.push(m.text().slice(0,200));});t0=Date.now();await p.goto(url);
  let text='';for(let i=0;i<120;i++){text=await deepText(p);if(/APAS fit/i.test(text)&&/(A-range|grade|GPA)/i.test(text))break;await p.waitForTimeout(500);}
  return{p,text,ms:Date.now()-t0};};
 const a=await sb('https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/4041/');record.sb4041Ms=a.ms;
 check('5 schedule builder','CSCI 4041 shows APAS fit ✓',/APAS fit/i.test(a.text)&&/✓/.test(a.text));
 check('5 schedule builder','CSCI 4041 names the core requirement',/Upper-division computer science c/i.test(a.text));
 check('5 schedule builder','CSCI 4041 prerequisites satisfied',/Prerequisites satisfied/i.test(a.text));
 const full=await a.p.evaluate(()=>{const find=(r:Document|ShadowRoot):string=>{for(const el of Array.from(r.querySelectorAll('*'))){if(el.tagName==='A'&&/Full planner/.test(el.textContent||''))return(el as HTMLAnchorElement).href;if(el.shadowRoot){const h=find(el.shadowRoot);if(h)return h;}}return'';};return find(document);});
 check('5 schedule builder','"Full planner ↗" links back to the Web app',full.startsWith(base),full.slice(0,120));
 record.sb4041Fit=/APAS fit.{0,160}/i.exec(a.text)?.[0];await a.p.close();
 const b=await sb('https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/');record.sb5302Ms=b.ms;
 check('5 schedule builder','CSCI 5302 shows grade history',/(A-range|GPA|grade)/i.test(b.text));
 check('5 schedule builder','CSCI 5302 shows student voices (Reddit)',/reddit/i.test(b.text));await b.p.close();
 const c=await sb('https://schedulebuilder.umn.edu/explore/2027Spring/PSY/1001/');record.sbPsyMs=c.ms;
 check('5 schedule builder','PSY 1001 shows Social sciences core',/Social sciences/i.test(c.text));
 check('5 schedule builder','PSY 1001 prerequisite flagged Needs review',/Needs review/i.test(c.text));
 const psyN=/(\d{1,3}(?:,\d{3})+)\s*students/.exec(c.text)?.[1];record.psyStudents=psyN;
 check('5 schedule builder','PSY 1001 large-sample grade history (README 19,704)',!!psyN,`page shows ${psyN}`);await c.p.close();
 // Exit demo
 await page.bringToFront();await page.keyboard.press('Escape');await page.waitForTimeout(300);await page.getByRole('button',{name:'Plan',exact:true}).click();await page.getByRole('button',{name:/Exit demo/}).click();await page.waitForTimeout(800);
 check('exit','Exit demo clears the demo profile',!(await page.locator('.demo-banner').count())&&!(await page.evaluate(()=>localStorage.getItem('umn.profile'))));
 check('all','no console errors from Smart UMN',consoleErrors.length===0,consoleErrors.slice(0,3).join(' | '));
}finally{await context.close();await fs.rm(work,{recursive:true,force:true});}
const failed=checks.filter(c=>!c.ok);
const result={checkedAt:new Date().toISOString(),origin:base,...record,passed:checks.length-failed.length,failed:failed.length,checks};
if(out)await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');
console.log(`${checks.length-failed.length}/${checks.length} reviewer-path checks passed`);if(failed.length)process.exitCode=1;
