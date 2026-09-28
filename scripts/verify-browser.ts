/** Release acceptance: a newly created browser profile and synthetic academic data only. */
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import{chromium}from'playwright-core';
const root=process.cwd(),base=process.env.PUBLIC_ORIGIN||'http://127.0.0.1:4317';
const manifest=JSON.parse(await fs.readFile(path.join(root,'dist/extension/manifest.json'),'utf8'));
const packageVersion=JSON.parse(await fs.readFile('package.json','utf8')).version;
if(manifest.version!==packageVersion)throw Error('Extension/package version mismatch');
const fixture=path.join(root,'tests/fixtures/apas-acceptance.html');
if(!(await fs.readFile(fixture,'utf8')).includes('Smart UMN Synthetic BA'))throw Error('Only the checked-in synthetic acceptance fixture may be imported');
const executablePath=process.env.SMART_UMN_CHROMIUM;
if(!executablePath)throw Error('Set SMART_UMN_CHROMIUM to a Chromium executable with unpacked-extension support');
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'smart-umn-acceptance-'));
const context=await chromium.launchPersistentContext(profile,{headless:process.env.HEADLESS!=='false',executablePath,viewport:{width:1280,height:900},args:[`--disable-extensions-except=${path.join(root,'dist/extension')}`,`--load-extension=${path.join(root,'dist/extension')}`]});
try{
 const page=await context.newPage();await page.goto(base);await page.getByRole('button',{name:'Connect APAS',exact:true}).waitFor();
 // Import through the same local file control used by students; no storage injection.
 await page.getByRole('button',{name:'Connect APAS',exact:true}).click();await page.getByText('Advanced / recovery',{exact:true}).click();await page.getByLabel('Import local APAS HTML').setInputFiles(fixture);
 await page.getByRole('heading',{name:'Smart UMN Synthetic BA',exact:true}).waitFor();
 if(!(await page.getByRole('group',{name:'Graduation roadmap',exact:true}).innerText()).includes('Not enough evidence'))throw Error('Unknown degree credits claimed a completion horizon');
 await page.getByRole('radio',{name:/Lightest useful load/}).check();await page.getByRole('button',{name:'Explore',exact:true}).click();await page.getByRole('button',{name:'Plan',exact:true}).click();
 if(!await page.getByRole('radio',{name:/Lightest useful load/}).isChecked())throw Error('Planning goal did not survive navigation');
 await page.getByRole('button',{name:'Build my plan',exact:true}).click();await page.locator('.schedule').waitFor({timeout:90000});if(!(await page.locator('.schedule').innerText()).includes('CSCI 5302'))throw Error('Synthetic prerequisite-backed schedule was not built');
 await page.reload();await page.getByRole('heading',{name:'Smart UMN Synthetic BA',exact:true}).waitFor();
 await page.setViewportSize({width:375,height:812});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);if(overflow)throw Error('Narrow Web overflow');await page.setViewportSize({width:1280,height:900});
 const dir=path.join(root,'docs/evidence');await fs.mkdir(dir,{recursive:true});await page.screenshot({path:path.join(dir,'synthetic-web-acceptance.png')});
 const sb=await context.newPage();await sb.goto('https://schedulebuilder.umn.edu/explore/2027Spring/MATH/1271/');const insight=sb.locator('smart-umn-insight[data-course="MATH 1271"]');await insight.waitFor({timeout:60000});await insight.locator('[data-insight="instructor-intelligence"]').waitFor();await insight.scrollIntoViewIfNeeded();await sb.screenshot({path:path.join(dir,'synthetic-extension-acceptance.png')});
 const report={checkedAt:new Date().toISOString(),version:packageVersion,identity:'checked-in synthetic fixture only',freshProfile:true,web:{import:true,unknownCredits:true,goalPersistence:true,reload:true,liveSchedule:true,narrowOverflow:false},extension:{course:'MATH 1271',inline:true,instructorEvidence:true},limits:['No real student academic data was used.','This gate does not prove every major or guarantee registration.']};
 await fs.writeFile(path.join(dir,'browser-acceptance.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await context.close();await fs.rm(profile,{recursive:true,force:true});}
