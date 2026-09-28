import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd(),dist=path.join(root,'dist/extension'),outDir=path.join(root,'release');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'manifest.json'),'utf8'));
const files:string[]=[];
const walk=(dir:string,prefix='')=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const rel=prefix?prefix+'/'+entry.name:entry.name,full=path.join(dir,entry.name);if(entry.isDirectory())walk(full,rel);else if(entry.isFile())files.push(rel);}};
walk(dist);
if(!files.length)throw new Error('Extension build is empty');
const fixed=new Date('2000-01-01T00:00:00.000Z');
for(const rel of files){const full=path.join(dist,rel);fs.chmodSync(full,0o644);fs.utimesSync(full,fixed,fixed);}
fs.mkdirSync(outDir,{recursive:true});
const out=path.join(outDir,`smart-umn-planner-extension-v${manifest.version}.zip`);
fs.rmSync(out,{force:true});
const result=spawnSync('zip',['-X','-q',out,...files],{cwd:dist,stdio:'inherit',env:{...process.env,TZ:'UTC'}});
if(result.status!==0)throw new Error('zip failed');
fs.copyFileSync(out,path.join(root,'dist/web/smart-umn-extension.zip'));
const size=fs.statSync(out).size;
if(size>10_000_000)throw new Error(`Extension package unexpectedly large: ${size} bytes`);
// Chrome Web Store rejects a manifest `key` ("key field is not allowed in manifest") and assigns its own item ID.
// The direct-download ZIP keeps `key` so Developer-mode installs keep the fixed ID; the Store ZIP is otherwise identical.
const storeDir=path.join(root,'dist/webstore');fs.rmSync(storeDir,{recursive:true,force:true});
for(const rel of files){const target=path.join(storeDir,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(dist,rel),target);}
const {key:_key,...storeManifest}=manifest;fs.writeFileSync(path.join(storeDir,'manifest.json'),JSON.stringify(storeManifest,null,1)+'\n');
for(const rel of files){const full=path.join(storeDir,rel);fs.chmodSync(full,0o644);fs.utimesSync(full,fixed,fixed);}
const storeOut=path.join(outDir,`smart-umn-planner-extension-v${manifest.version}-webstore.zip`);fs.rmSync(storeOut,{force:true});
const storeResult=spawnSync('zip',['-X','-q',storeOut,...files],{cwd:storeDir,stdio:'inherit',env:{...process.env,TZ:'UTC'}});
if(storeResult.status!==0)throw new Error('store zip failed');
console.log(JSON.stringify({out:path.relative(root,out),webstore:path.relative(root,storeOut),version:manifest.version,bytes:size,deterministic:true},null,2));
