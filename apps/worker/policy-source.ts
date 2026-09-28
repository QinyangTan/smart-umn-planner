import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {JevBrowser} from './jev.ts';

export type JevPolicySnapshot={url:string;title:string;text:string;sourceHash:string;screens:number;extractor:'jev-ultrafast';transport:'chrome-use'|'playwright';capturedAt:string};

export function allowedPolicySource(raw:string):URL{
 const u=new URL(raw);
 if(u.protocol!=='https:')throw Error('Policy source must use HTTPS');
 const h=u.hostname.toLowerCase();
 if(h!=='umn.edu'&&!h.endsWith('.umn.edu')&&h!=='umn.uachieve.com')throw Error('Policy snapshot is restricted to public UMN hosts');
 return u;
}

function mergeSnapshot(chunks:string[],snap:any,last:string){const value=String(snap?.text||'').trim();if(value&&value!==last)chunks.push(value);return value||last;}
function finish(url:URL,title:string,chunks:string[],screens:number,transport:JevPolicySnapshot['transport']):JevPolicySnapshot{
 const text=[...new Set(chunks)].join('\n').replace(/\n{3,}/g,'\n\n').trim();if(!text)throw Error('No visible public policy text captured');
 return{url:url.href,title,text,sourceHash:createHash('sha256').update(text).digest('hex'),screens,extractor:'jev-ultrafast',transport,capturedAt:new Date().toISOString()};
}
async function withChromeUse(url:URL,maxScreens:number){
 const browser=new JevBrowser(process.env.CHROME_USE_BIN,'smart-umn-policy');await browser.open(url.href);
 const chunks:string[]=[];let title='',screens=0,last='';
 for(let i=0;i<maxScreens;i++){const snap=await browser.snapshot();if(!snap||typeof snap!=='object')throw Error('JEV policy snapshot unavailable');title=title||String((snap as any).title||'');last=mergeSnapshot(chunks,snap,last);screens++;const scroll=(snap as any).scroll;if(!scroll||Number(scroll.y)+Number((snap as any).h)>=Number(scroll.height)-2)break;await browser.evaluate('window.scrollBy(0,Math.max(420,Math.floor(innerHeight*0.82)));true');await new Promise(r=>setTimeout(r,140));}
 return finish(url,title,chunks,screens,'chrome-use');
}
function chromiumPath(){
 const candidates=[process.env.SMART_UMN_CHROMIUM,resolve('.runtime/playwright-browsers/chromium-1193/chrome-mac/Chromium.app/Contents/MacOS/Chromium'),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter((x):x is string=>!!x);
 return candidates.find(existsSync);
}
async function withPlaywright(url:URL,maxScreens:number){
 const executablePath=chromiumPath();if(!executablePath)throw Error('JEV browser transport unavailable: set CHROME_USE_BIN or SMART_UMN_CHROMIUM');
 const browser=await chromium.launch({headless:true,executablePath});const page=await browser.newPage({viewport:{width:1280,height:900}});
 try{await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});const snapshotJs=readFileSync(new URL('../../packages/community/upstream/snapshot.js',import.meta.url),'utf8'),chunks:string[]=[];let title='',screens=0,last='';
  for(let i=0;i<maxScreens;i++){const snap=await page.evaluate(snapshotJs) as any;if(!snap)throw Error('JEV policy snapshot unavailable');title=title||String(snap.title||'');last=mergeSnapshot(chunks,snap,last);screens++;if(!snap.scroll||Number(snap.scroll.y)+Number(snap.h)>=Number(snap.scroll.height)-2)break;await page.evaluate(()=>window.scrollBy(0,Math.max(420,Math.floor(innerHeight*.82))));await page.waitForTimeout(140);}
  return finish(url,title,chunks,screens,'playwright');
 }finally{await browser.close();}
}
export async function snapshotPolicySource(raw:string,maxScreens=12):Promise<JevPolicySnapshot>{
 const url=allowedPolicySource(raw);if(!Number.isInteger(maxScreens)||maxScreens<1||maxScreens>24)throw Error('maxScreens must be 1–24');
 return process.env.CHROME_USE_BIN?withChromeUse(url,maxScreens):withPlaywright(url,maxScreens);
}
