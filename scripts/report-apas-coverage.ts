import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {parseAPAS} from '../packages/apas-parser/index.ts';
import {analyzeRequirementRouteCoverage} from '../packages/core/rules.ts';
import {APAS_MATRIX_FIXTURES} from '../tests/fixtures/apas-matrix.ts';

const root=process.cwd();
const out=path.join(root,'docs/evidence/apas-coverage-20260927.json');

function analyzeHtml(html:string){
 const dom=new JSDOM(html);
 try{
  const profile=parseAPAS(dom.window.document);
  return{
   program:{name:profile.program.name,kind:profile.program.kind,campus:profile.program.campus},
   parserVersion:profile.parserVersion,
   summary:analyzeRequirementRouteCoverage(profile).overall
  };
 }finally{dom.window.close();}
}

const synthetic=APAS_MATRIX_FIXTURES.map(f=>({fixture:f.name,...analyzeHtml(f.html)}));
const realPath=path.join(root,'.runtime/private-audit.html');
let savedReal:{available:boolean;source:string;analysis?:ReturnType<typeof analyzeHtml>;error?:string}={available:false,source:'.runtime/private-audit.html'};
if(fs.existsSync(realPath)){
 try{savedReal={available:true,source:'.runtime/private-audit.html',analysis:analyzeHtml(fs.readFileSync(realPath,'utf8'))};}
 catch(error){savedReal={available:true,source:'.runtime/private-audit.html',error:error instanceof Error?error.message:String(error)};}
}
const report={
 generatedAt:new Date().toISOString(),
 scope:'UMN Twin Cities',
 privacy:'Aggregate parser coverage only; raw APAS HTML and course history are not copied into this report.',
 synthetic:{
  fixtureCount:synthetic.length,
  programKinds:[...new Set(synthetic.map(x=>x.program.kind))].sort(),
  all:synthetic,
  aggregate:{
   strictSupportedRequirements:synthetic.reduce((n,x)=>n+x.summary.strictSupportedRequirements,0),
   candidateRouteSupportedRequirements:synthetic.reduce((n,x)=>n+x.summary.candidateRouteSupportedRequirements,0),
   unknownUnroutedRequirements:synthetic.reduce((n,x)=>n+x.summary.unknownUnroutedRequirements,0)
  }
 },
 savedReal
};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
console.error(`Wrote ${out}`);
