import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseAPAS} from '../packages/apas-parser/index.ts';
import {analyzeRequirementRouteCoverage,degreeDiscoveryPlan} from '../packages/core/rules.ts';
import {APAS_MATRIX_FIXTURES} from './fixtures/apas-matrix.ts';

test('cross-major synthetic APAS matrix stays program-agnostic across degrees, majors, minors and certificates',()=>{
 for(const fixture of APAS_MATRIX_FIXTURES){
  const dom=new JSDOM(fixture.html);
  const profile=parseAPAS(dom.window.document);
  const analysis=analyzeRequirementRouteCoverage(profile).overall;
  const plan=degreeDiscoveryPlan(profile,'UMNTC');
  assert.equal(profile.program.name,fixture.name,fixture.name);
  assert.equal(profile.program.kind,fixture.kind,fixture.name);
  assert.equal(analysis.strictSupportedRequirements,fixture.expected.strict,fixture.name);
  assert.equal(analysis.candidateRouteSupportedRequirements,fixture.expected.candidate,fixture.name);
  assert.equal(analysis.unknownUnroutedRequirements,fixture.expected.unknown,fixture.name);
  assert.equal(analysis.breakdown[fixture.expected.bucket as keyof typeof analysis.breakdown],1,fixture.name);
  const discovered=[...plan.explicitCodes,...plan.subjects];
  assert.ok(discovered.includes(fixture.expected.discovery),`${fixture.name}: expected discovery ${fixture.expected.discovery}, got ${discovered.join(', ')}`);
  dom.window.close();
 }
});

test('synthetic matrix spans distinct colleges and all intended program kinds without a title allowlist',()=>{
 const kinds=new Set(APAS_MATRIX_FIXTURES.map(f=>f.kind));
 assert.deepEqual([...kinds].sort(),['certificate','degree','major','minor']);
 assert.ok(APAS_MATRIX_FIXTURES.length>=12);
 for(const fixture of APAS_MATRIX_FIXTURES){
  assert.doesNotMatch(fixture.html,/BSCompSc|College of Science and Engineering|CSE-only/i);
 }
});
