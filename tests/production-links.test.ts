import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

test('production Schedule Builder links preserve course context and use the compiled HTTPS origin', async()=>{
 const origin='https://smartumn.qinyangtan.com';
 const output=await build({entryPoints:['apps/extension/schedule-dom.ts'],bundle:true,write:false,format:'esm',platform:'browser',define:{__SMART_UMN_WEB_ORIGIN__:JSON.stringify(origin)}});
 const module=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
 const dom=new JSDOM('<div class="course-list-results"><div><a name="CSCI5302"></a><div class="panel"><div class="panel-body"></div></div></div></div>',{url:'https://schedulebuilder.umn.edu/explore/2027Spring/CSCI/5302/'});
 const app=module.installEnhancements(dom.window.document,{batch:async()=>[],fit:async()=>({connected:false,items:[]}),connect:async()=>({})});
 try{
  await new Promise(resolve=>setTimeout(resolve,280));
  const link=dom.window.document.querySelector('smart-umn-insight')?.shadowRoot?.querySelector('a');
  assert.ok(link,'Provider failure must still offer a usable planner link');
  const url=new URL(link.href);
  assert.equal(url.origin,origin);
  assert.equal(url.searchParams.get('course'),'CSCI 5302');
  assert.equal(url.searchParams.get('term'),'1273');
  assert.equal(url.searchParams.get('campus'),'UMNTC');
  assert.equal(link.target,'_blank');
  assert.match(link.rel,/noopener/);
 }finally{app.disconnect();dom.window.close();}
});
