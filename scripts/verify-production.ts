import{readFileSync,writeFileSync}from'node:fs';import{resolveCname}from'node:dns/promises';import{connect}from'node:tls';
import{runCanary}from'../packages/ops/canary.ts';

// Usage: npm run verify:production [-- --origin https://… --out report.json]
const arg=(name:string)=>{const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:undefined;};
const origin=(arg('--origin')||'https://smartumn.qinyangtan.com').replace(/\/$/,'');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const certificateExpiry=(host:string)=>new Promise<number>((resolve,reject)=>{const s=connect({host,port:443,servername:host,timeout:15000},()=>{const c=s.getPeerCertificate();s.end();if(!s.authorized)return reject(Error(String(s.authorizationError)));resolve(Date.parse(c.valid_to));});s.on('error',reject);s.on('timeout',()=>{s.destroy();reject(Error('TLS timeout'));});});
const report=await runCanary({
 origin,expectedVersion:pkg.version,
 releaseZip:readFileSync(`release/smart-umn-planner-extension-v${pkg.version}.zip`),
 seed:JSON.parse(readFileSync('config/public-evidence-seed.json','utf8')),
 resolveCname,certificateExpiry,
 expectedCname:origin==='https://smartumn.qinyangtan.com'?'smart-umn-planner.netlify.app':undefined,
});
const out=arg('--out');if(out)writeFileSync(out,JSON.stringify(report,null,2)+'\n');
for(const c of report.checks)console.log(`${c.status==='pass'?'PASS':c.status==='warn'?'WARN':'FAIL'}  [${c.category}] ${c.id} — ${c.detail}`);
const failed=report.checks.filter(c=>c.status==='fail');
console.log(failed.length?`\n${failed.length} failing check(s): ${[...new Set(failed.map(c=>c.category))].join(', ')}`:'\nProduction canary passed');
if(!report.ok)process.exitCode=1;
