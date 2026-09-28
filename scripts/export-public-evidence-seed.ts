import{DatabaseSync}from'node:sqlite';import{mkdirSync,writeFileSync}from'node:fs';import{dirname,resolve}from'node:path';
const dbPath=resolve(process.argv[2]||process.env.PLANNER_DB||'var/planner.sqlite'),out=resolve(process.argv[3]||'config/public-evidence-seed.json');
const db=new DatabaseSync(dbPath,{readOnly:true});
const snapshots=db.prepare("SELECT key,source,retrieved_at,payload FROM source_snapshots WHERE key LIKE 'policy:%' ORDER BY key").all().map((r:any)=>({key:String(r.key),source:String(r.source),retrievedAt:String(r.retrieved_at),payload:JSON.parse(String(r.payload))}));
const community=db.prepare("SELECT payload FROM community_references ORDER BY source,url").all().map((r:any)=>JSON.parse(String(r.payload)));
db.close();
if(!snapshots.length)throw Error('No reviewed policy snapshots found');
for(const row of snapshots){if(!row.key.startsWith('policy:')||typeof row.payload?.url!=='string'||!row.payload.url.startsWith('https://'))throw Error('Invalid public policy seed row');}
for(const ref of community){if(!['reddit','ratemyprofessor','forum','other'].includes(ref?.source)||typeof ref?.url!=='string'||!ref.url.startsWith('https://')||typeof ref?.entityId!=='string')throw Error('Invalid public community seed row');}
const seed={schemaVersion:1,snapshots,community};mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(seed,null,2)+'\n');
console.log(JSON.stringify({dbPath,out,snapshots:snapshots.length,community:community.length,bytes:Buffer.byteLength(JSON.stringify(seed))},null,2));
