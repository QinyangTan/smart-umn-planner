import{readFileSync,existsSync}from'node:fs';
import{Store}from'../../packages/providers/store.ts';
import{makeReference,makeInstructorReference,canonicalURL}from'../../packages/community/index.ts';
import{campusCode,courseEntityKey,instructorEntityKey}from'../../packages/schemas/index.ts';
import{JevBrowser}from'./jev.ts';import{snapshotPolicySource}from'./policy-source.ts';

// A single bounded process uses its own named persistent browser session. It never
// joins the ChatGPT supervisor session and never exports browser state or cookies.
const store=new Store(process.env.PLANNER_DB||'var/planner.sqlite');
const[action,...rawArgs]=process.argv.slice(2);const campusFlag=rawArgs.find(a=>a.startsWith('--campus=')),args=rawArgs.filter(a=>!a.startsWith('--campus=')),campus=campusFlag?campusCode(campusFlag.slice('--campus='.length)):'UMNTC';

type Kind='course'|'instructor';
async function collect(kind:Kind,entity:string,url:string){
 const canonical=canonicalURL(url),host=new URL(canonical).hostname;
 // Policy decisions are site-specific and versioned by the operator. Without an
 // explicit reviewed allow record, automated collection remains disabled.
 const policyPath='config/community-policy.json';const policies=existsSync(policyPath)?JSON.parse(readFileSync(policyPath,'utf8')):{};
 const policy=policies[host];
 if(!policy?.reviewedAt||!policy.basisUrl||Date.now()-Date.parse(policy.reviewedAt)>30*86400000)throw Error('Site has no current reviewed collection policy. Use link import; do not bypass restrictions.');
 if(policy.mode!=='allow')throw Error(`Automated collection disabled for ${host}: ${policy.note||'link-only policy'}`);
 const entityId=kind==='course'?courseEntityKey(entity,campus):instructorEntityKey(entity,campus);
 const prior=store.db.prepare('SELECT last_checked FROM crawl_jobs WHERE entity_id=?').get(entityId);
 if(prior?.last_checked&&Date.now()-Date.parse(String(prior.last_checked))<6*3600000)throw Error('Incremental job is not due; six-hour cooldown');
 const last=store.db.prepare('SELECT MAX(last_checked) AS last_checked FROM crawl_jobs').get();
 if(last?.last_checked&&Date.now()-Date.parse(String(last.last_checked))<15000)throw Error('Conservative collector rate limit: one navigation per 15 seconds');
 store.db.prepare('INSERT OR REPLACE INTO crawl_jobs VALUES(?,?,?,?)').run(entityId,new Date().toISOString(),'running',null);
 try{
  const browser=new JevBrowser();await browser.open(canonical);const snapshot=await browser.snapshot();const d=await browser.discussionDOM();
  if(d.blocked)throw Error('Public collection blocked; use original links only');
  const ref=kind==='course'
   ?makeReference(entity,d.title,d.url,d.excerpt,d.publishedAt,'jev-rendered-dom',campus)
   :makeInstructorReference(entity,d.title,d.url,d.excerpt,d.publishedAt,'jev-rendered-dom',campus);
  store.reference(ref);store.db.prepare('UPDATE crawl_jobs SET status=?,message=? WHERE entity_id=?').run('complete','One neutral reference collected',entityId);
  console.log(JSON.stringify({stored:ref.id,url:ref.url,entityType:ref.entityType,jevSnapshotObserved:!!snapshot}));
 }catch(error){
  store.db.prepare('UPDATE crawl_jobs SET status=?,message=? WHERE entity_id=?').run('blocked',error instanceof Error?error.message:'Unknown failure',entityId);
  throw error;
 }
}

try{
 if(action==='import-link'){
  const[entity,url,title]=args;const r=makeReference(entity,title,url,'',undefined,'manual-link',campus);store.reference(r);console.log(JSON.stringify({stored:r.id,url:r.url,entityType:r.entityType,mode:'link-only'}));
 }else if(action==='import-reviewed-link'){
  const[entity,url,title,excerpt,publishedAt]=args;if(!excerpt?.trim()||!publishedAt||!/^\d{4}-\d{2}-\d{2}/.test(publishedAt))throw Error('Reviewed link requires excerpt and published date');const r=makeReference(entity,title,url,excerpt,publishedAt,'reviewed-summary',campus);store.reference(r);console.log(JSON.stringify({stored:r.id,url:r.url,entityType:r.entityType,mode:'reviewed-manual-excerpt',topics:r.topics}));
 }else if(action==='import-instructor-link'){
  const[name,url,title]=args;const r=makeInstructorReference(name,title,url,'',undefined,'manual-link',campus);store.reference(r);console.log(JSON.stringify({stored:r.id,url:r.url,entityType:r.entityType,entityId:r.entityId,mode:'link-only'}));
 }else if(action==='import-reviewed-instructor-link'){
  const[name,url,title,excerpt,publishedAt]=args;if(!excerpt?.trim()||!publishedAt||!/^\d{4}-\d{2}-\d{2}/.test(publishedAt))throw Error('Reviewed instructor link requires excerpt and published date');const r=makeInstructorReference(name,title,url,excerpt,publishedAt,'reviewed-summary',campus);store.reference(r);console.log(JSON.stringify({stored:r.id,url:r.url,entityType:r.entityType,entityId:r.entityId,mode:'reviewed-manual-excerpt',topics:r.topics}));
 }else if(action==='collect'){
  await collect('course',args[0],args[1]);
 }else if(action==='collect-instructor'){
  await collect('instructor',args[0],args[1]);
 }else if(action==='snapshot-policy'){
  const snapshot=await snapshotPolicySource(args[0],Number(args[1]||12));store.put(`policy-manual:${snapshot.sourceHash}`,'jev-ultrafast',snapshot,snapshot.capturedAt);console.log(JSON.stringify({stored:`policy-manual:${snapshot.sourceHash}`,url:snapshot.url,title:snapshot.title,screens:snapshot.screens,extractor:snapshot.extractor,sourceHash:snapshot.sourceHash,note:'Manual snapshots are not added to the curated student policy index until listed in config/policy-sources.json'}));
 }else if(action==='status'){
  console.log(JSON.stringify(store.db.prepare('SELECT * FROM crawl_jobs').all()));
 }else{
  console.log('Usage: npm run worker -- import-link "PSY 1001" <original-url> <verified-title> | import-reviewed-link "PSY 1001" <original-url> <verified-title> <manual-excerpt> <published-at> | import-instructor-link <name> <original-url> <verified-title> | import-reviewed-instructor-link <name> <original-url> <verified-title> <manual-excerpt> <published-at> | collect <course> <original-url> | collect-instructor <name> <original-url> | snapshot-policy <public-umn-url> [max-screens] | status [--campus=...]');
 }
}catch(e){console.error(e instanceof Error?e.message:'Collector error');process.exitCode=1;}finally{store.close();}
