import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {parseAPAS} from '../packages/apas-parser/index.ts';
import {compatibilityReport} from '../packages/core/compatibility.ts';

const [auditPath,historyPath]=process.argv.slice(2);
if(!auditPath)throw new Error('Usage: npm run report:apas-compatibility -- <saved-audit.html> [saved-course-history.html]');
const read=(p:string)=>{const stat=fs.statSync(p);if(stat.size>5_000_000)throw new Error('APAS file exceeds 5 MB local validation limit');return fs.readFileSync(p,'utf8');};
const audit=new JSDOM(read(auditPath));
const history=historyPath?new JSDOM(read(historyPath)):undefined;
try{
 const profile=parseAPAS(audit.window.document,history?.window.document);
 const report=compatibilityReport(profile);
 console.log(JSON.stringify(report,null,2));
}finally{audit.window.close();history?.window.close();}
