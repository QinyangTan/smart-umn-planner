import {readFileSync} from 'node:fs';
import {Store} from '../packages/providers/store.ts';
import {snapshotPolicySource} from '../apps/worker/policy-source.ts';
const sources=JSON.parse(readFileSync('config/policy-sources.json','utf8'));if(!Array.isArray(sources))throw Error('Policy source manifest must be an array');
const store=new Store();const report=[];const stableKeys=new Set(sources.map((source:any)=>`policy:${source.id}`));for(const row of store.db.prepare("SELECT key FROM source_snapshots WHERE key LIKE 'policy:%'").all())if(!stableKeys.has(String(row.key)))store.db.prepare('DELETE FROM source_snapshots WHERE key=?').run(String(row.key));
try{for(const source of sources){try{const snapshot=await snapshotPolicySource(String(source.url),12);store.put(`policy:${source.id}`,'jev-ultrafast',{...snapshot,sourceId:source.id,scope:source.scope,purpose:source.purpose},snapshot.capturedAt);report.push({id:source.id,status:'ok',url:snapshot.url,hash:snapshot.sourceHash,screens:snapshot.screens,transport:snapshot.transport});}catch(error){report.push({id:source.id,status:'error',url:source.url,error:error instanceof Error?error.message:String(error)});}}}finally{store.close();}
console.log(JSON.stringify({refreshedAt:new Date().toISOString(),sources:report,ok:report.filter(x=>x.status==='ok').length,failed:report.filter(x=>x.status==='error').length},null,2));
if(report.some(x=>x.status==='error'))process.exitCode=1;
