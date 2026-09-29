/** README feature GIFs: fresh profile, canonical production, synthetic APAS fixture only. Requires ffmpeg. */
import fs from'node:fs';import path from'node:path';import os from'node:os';import{spawnSync}from'node:child_process';
import{chromium,type Page,type Locator}from'playwright-core';
const root=process.cwd(),base=(process.env.PUBLIC_ORIGIN||'https://smartumn.qinyangtan.com').replace(/\/$/,'');
const executablePath=process.env.SMART_UMN_CHROMIUM;if(!executablePath)throw Error('Set SMART_UMN_CHROMIUM');
const ext=path.resolve(process.env.SMART_UMN_EXTENSION_DIR||'dist/extension');
const fixture=path.join(root,'tests/fixtures/apas-acceptance.html');if(!fs.readFileSync(fixture,'utf8').includes('Smart UMN Synthetic BA'))throw Error('Synthetic fixture only');
const outDir=path.join(root,'docs/demos'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'smart-umn-gifs-')),size={width:1280,height:800};
const pause=(p:Page,ms:number)=>p.waitForTimeout(ms);
// Visible pointer: Playwright video does not render the OS cursor.
async function pointer(p:Page){await p.evaluate(()=>{if(document.getElementById('demo-pointer'))return;const d=document.createElement('div');d.id='demo-pointer';d.style.cssText='position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(122,0,25,.28);border:2px solid #7a0019;pointer-events:none;transition:left .45s ease,top .45s ease,transform .15s';document.documentElement.append(d);});}
async function moveTo(p:Page,l:Locator){await l.scrollIntoViewIfNeeded();const b=(await l.boundingBox())!;await pointer(p);await p.evaluate(([x,y])=>{const d=document.getElementById('demo-pointer')!;d.style.left=x+'px';d.style.top=y+'px';},[b.x+b.width/2,b.y+b.height/2]);await pause(p,550);}
async function click(p:Page,l:Locator){await moveTo(p,l);await p.evaluate(()=>{const d=document.getElementById('demo-pointer');if(d){d.style.transform='scale(.7)';setTimeout(()=>d.style.transform='',160);}});await l.click();}
async function smoothScroll(p:Page,y:number,ms=900){await p.evaluate(([to,dur])=>new Promise<void>(r=>{const from=scrollY,start=performance.now();const step=(t:number)=>{const k=Math.min(1,(t-start)/dur);scrollTo(0,from+(to-from)*(1-Math.cos(Math.PI*k))/2);k<1?requestAnimationFrame(step):r();};requestAnimationFrame(step);}),[y,ms]);}
function toGif(video:string,name:string,trimStart=0){
 const out=path.join(outDir,name),palette=path.join(tmp,name+'.png'),filters=`fps=10,scale=880:-1:flags=lanczos`;
 for(const args of[['-y','-ss',String(trimStart),'-i',video,'-vf',`${filters},palettegen=stats_mode=diff`,palette],['-y','-ss',String(trimStart),'-i',video,'-i',palette,'-lavfi',`${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,out]]){const r=spawnSync('ffmpeg',['-loglevel','error',...args]);if(r.status!==0)throw Error(String(r.stderr));}
 console.log(name,(fs.statSync(out).size/1e6).toFixed(2)+' MB');
}
async function record(name:string,withExtension:boolean,flow:(p:Page)=>Promise<void>,trim=0){
 const dir=path.join(tmp,name);const ctx=await chromium.launchPersistentContext(path.join(tmp,'profile-'+name),{headless:true,executablePath,viewport:size,recordVideo:{dir,size},args:withExtension?[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]:[]});
 const p=ctx.pages()[0]||await ctx.newPage();try{await flow(p);}finally{await ctx.close();}
 const video=fs.readdirSync(dir).find(f=>f.endsWith('.webm'))!;toGif(path.join(dir,video),name,trim);
}
// 1. APAS import → personalized plan → generated week.
await record('feature-apas-to-plan.gif',false,async p=>{
 await p.goto(base+'/');await p.getByRole('button',{name:'Connect APAS',exact:true}).waitFor();await pause(p,900);
 await click(p,p.getByRole('button',{name:'Connect APAS',exact:true}));await pause(p,500);
 await click(p,p.getByText('Advanced / recovery',{exact:true}));await p.getByLabel('Import local APAS HTML').setInputFiles(fixture);
 await p.getByRole('heading',{name:'Smart UMN Synthetic BA',exact:true}).waitFor();await pause(p,1400);
 await click(p,p.getByRole('radio',{name:/Make degree progress/}));await pause(p,500);
 const build=p.getByRole('button',{name:'Build my plan',exact:true});await click(p,build);
 await p.locator('.schedule').first().waitFor({timeout:90000});await pause(p,600);
 const top=await p.locator('.schedule').first().evaluate(e=>e.getBoundingClientRect().top+scrollY-90);await smoothScroll(p,top,1200);await pause(p,2600);
},1.2);
// 2. Course intelligence inside the real Schedule Builder page.
await record('feature-schedule-builder-insights.gif',true,async p=>{
 await p.goto('https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/');await p.locator('smart-umn-insight button.insight').first().waitFor({timeout:60000});await pause(p,1500);
 await smoothScroll(p,120,700);await pause(p,600);
 const grades=p.locator('smart-umn-insight button[data-tab]').nth(1);await click(p,grades);await pause(p,2200);
 await smoothScroll(p,420,1100);await pause(p,1200);await smoothScroll(p,120,900);
 const prof=p.locator('smart-umn-insight button[data-tab]').nth(2);await click(p,prof);await pause(p,2600);
},1.5);
// 3. Explore: look up a course and inspect its evidence.
await record('feature-explore-evidence.gif',false,async p=>{
 await p.goto(base+'/#Explore');await p.locator('#query').waitFor();await pause(p,900);
 await click(p,p.locator('#query'));await p.locator('#query').pressSequentially('CSCI 5302',{delay:90});await pause(p,300);await p.keyboard.press('Enter');
 await p.locator('dialog[open]').waitFor({timeout:60000});await pause(p,1400);
 await click(p,p.locator('dialog[open] summary',{hasText:'Optional course experience evidence'}));await pause(p,1200);
 await p.locator('dialog[open]').evaluate(d=>new Promise<void>(r=>{let y=0;const t=setInterval(()=>{y+=12;d.scrollTop=y;if(y>=1100){clearInterval(t);r();}},30);}));await pause(p,2000);
},1.0);
fs.rmSync(tmp,{recursive:true,force:true});
