import{build}from'esbuild';import{mkdir,copyFile,readFile,writeFile,rm}from'node:fs/promises';
import{plannerOrigin}from'../packages/config/origin.ts';
const origin=plannerOrigin(process.env.PUBLIC_ORIGIN||'http://127.0.0.1:4317');
const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.PUBLIC_ORIGIN||!origin.startsWith('https://')))throw Error('Production build requires HTTPS PUBLIC_ORIGIN');
for(const dir of ['dist/web','dist/extension']){await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});}
const options={bundle:true,target:'chrome120',sourcemap:!production,minify:production,define:{__SMART_UMN_WEB_ORIGIN__:JSON.stringify(origin)}};
await build({...options,entryPoints:['apps/web/app.ts'],outfile:'dist/web/app.js',format:'esm'});
for(const f of ['index.html','style.css'])await copyFile('apps/web/'+f,'dist/web/'+f);
for(const name of ['background','apas','schedule','bridge'])await build({...options,entryPoints:[`apps/extension/${name}.ts`],outfile:`dist/extension/${name}.js`,format:name==='background'?'esm':'iife'});
const manifest=JSON.parse(await readFile('apps/extension/manifest.json','utf8'));
// Chrome match patterns cannot restrict ports; bridge.ts checks the full origin.
const match=origin.replace(/:\d+$/,'')+'/*';
manifest.host_permissions=manifest.host_permissions.filter(x=>!x.startsWith('http://127.0.0.1'));
manifest.host_permissions.push(match);
manifest.content_scripts.find(x=>x.js.includes('bridge.js')).matches=[match];
await writeFile('dist/extension/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('dist/build.json',JSON.stringify({version:manifest.version,origin,production})+'\n');
console.log(`Built Web and inline-only extension for ${origin}`);
