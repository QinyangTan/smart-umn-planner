import{build}from'esbuild';import{mkdir,copyFile}from'node:fs/promises';
await mkdir('dist/web',{recursive:true});await mkdir('dist/extension',{recursive:true});
await build({entryPoints:['apps/web/app.ts'],outfile:'dist/web/app.js',bundle:true,format:'esm',target:'chrome120',sourcemap:true});
for(const f of ['index.html','style.css'])await copyFile('apps/web/'+f,'dist/web/'+f);
for(const name of ['background','apas','schedule','bridge'])await build({entryPoints:[`apps/extension/${name}.ts`],outfile:`dist/extension/${name}.js`,bundle:true,format:name==='background'?'esm':'iife',target:'chrome120',sourcemap:true});
await copyFile('apps/extension/manifest.json','dist/extension/manifest.json');
console.log('Built web application and inline-only Chrome extension');
