import fs from'node:fs';import path from'node:path';
import{compatibilityCoverageMarkdown,parseCompatibilityCorpus,summarizeCompatibilityCorpus}from'../packages/core/compatibility.ts';
const file=process.argv[2]?path.resolve(process.argv[2]):path.resolve('docs/evidence/apas-compatibility-corpus.json'),coverageFile=process.argv[3]?path.resolve(process.argv[3]):path.resolve('docs/APAS_COMPATIBILITY_COVERAGE.md');
if(!fs.existsSync(file))throw new Error(`Compatibility corpus not found: ${file}`);
const corpus=parseCompatibilityCorpus(JSON.parse(fs.readFileSync(file,'utf8'))),summary=summarizeCompatibilityCorpus(corpus),expectedCoverage=compatibilityCoverageMarkdown(corpus);
if(!fs.existsSync(coverageFile))throw new Error(`Compatibility coverage dashboard not found: ${coverageFile}. Run npm run report:apas-corpus.`);
if(fs.readFileSync(coverageFile,'utf8')!==expectedCoverage)throw new Error(`Compatibility coverage dashboard is stale: ${coverageFile}. Run npm run report:apas-corpus.`);
console.log(JSON.stringify({file,coverageFile,...summary},null,2));
if(summary.unresolvedReports||summary.unclassifiedPolicyReports){console.error('Compatibility corpus contains unresolved or unclassified policy reports; add a sanitized regression and fix the parser before release.');process.exitCode=1;}
