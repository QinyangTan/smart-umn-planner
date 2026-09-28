import fs from'node:fs';import path from'node:path';
import{parseCompatibilityCorpus,summarizeCompatibilityCorpus}from'../packages/core/compatibility.ts';
const file=process.argv[2]?path.resolve(process.argv[2]):path.resolve('docs/evidence/apas-compatibility-corpus.json');
if(!fs.existsSync(file))throw new Error(`Compatibility corpus not found: ${file}`);
const corpus=parseCompatibilityCorpus(JSON.parse(fs.readFileSync(file,'utf8'))),summary=summarizeCompatibilityCorpus(corpus);
console.log(JSON.stringify({file,...summary},null,2));
if(summary.unresolvedReports||summary.unclassifiedPolicyReports){console.error('Compatibility corpus contains unresolved or unclassified policy reports; add a sanitized regression and fix the parser before release.');process.exitCode=1;}
