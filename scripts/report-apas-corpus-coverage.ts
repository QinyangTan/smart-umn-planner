import fs from'node:fs';import path from'node:path';
import{compatibilityCoverageMarkdown,parseCompatibilityCorpus}from'../packages/core/compatibility.ts';
const[corpusArg,outArg]=process.argv.slice(2),corpusPath=path.resolve(corpusArg||'docs/evidence/apas-compatibility-corpus.json'),outPath=path.resolve(outArg||'docs/APAS_COMPATIBILITY_COVERAGE.md');
const corpus=parseCompatibilityCorpus(JSON.parse(fs.readFileSync(corpusPath,'utf8'))),markdown=compatibilityCoverageMarkdown(corpus);
fs.writeFileSync(outPath,markdown);console.log(JSON.stringify({corpusPath,outPath,reports:corpus.reports.length},null,2));
