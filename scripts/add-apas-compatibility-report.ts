import fs from'node:fs';import path from'node:path';
import{APAS_COMPATIBILITY_CORPUS_KIND,APAS_COMPATIBILITY_SCHEMA_VERSION,compatibilityStructureKey,parseCompatibilityCorpus,parseCompatibilityReport,summarizeCompatibilityCorpus}from'../packages/core/compatibility.ts';
const[reportArg,corpusArg]=process.argv.slice(2);if(!reportArg)throw new Error('Usage: npm run add:apas-corpus -- <anonymous-report.json> [corpus.json]');
const reportPath=path.resolve(reportArg),corpusPath=path.resolve(corpusArg||'docs/evidence/apas-compatibility-corpus.json'),report=parseCompatibilityReport(JSON.parse(fs.readFileSync(reportPath,'utf8')));
const corpus=fs.existsSync(corpusPath)?parseCompatibilityCorpus(JSON.parse(fs.readFileSync(corpusPath,'utf8'))):{kind:APAS_COMPATIBILITY_CORPUS_KIND,schemaVersion:APAS_COMPATIBILITY_SCHEMA_VERSION,reports:[]};
const key=compatibilityStructureKey(report);if(corpus.reports.some(r=>compatibilityStructureKey(r)===key))throw new Error(`Anonymous compatibility structure already present: ${report.fingerprint}`);
corpus.reports.push(report);corpus.reports.sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint)||a.generatedAt.localeCompare(b.generatedAt));fs.mkdirSync(path.dirname(corpusPath),{recursive:true});fs.writeFileSync(corpusPath,JSON.stringify(corpus,null,2)+'\n');
console.log(JSON.stringify({corpusPath,addedFingerprint:report.fingerprint,...summarizeCompatibilityCorpus(corpus)},null,2));
