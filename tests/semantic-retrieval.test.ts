import test from 'node:test';
import assert from 'node:assert/strict';
import {HybridPolicyRetriever,tokenize,type Embedder,type PolicyDocument} from '../packages/retrieval/policy.ts';
import {loadPolicyRegistry,policyDocumentsFromSnapshots} from '../packages/retrieval/registry.ts';
import {allowedPolicySource} from '../apps/worker/policy-source.ts';

test('policy registry is unique, review-safe, and Twin Cities scoped',()=>{
 const docs=loadPolicyRegistry();assert.ok(docs.length>=8);assert.equal(new Set(docs.map(d=>d.id)).size,docs.length);
 assert.ok(docs.every(d=>d.scope.campus==='UMNTC'));assert.ok(docs.some(d=>d.family==='qualified-attribute'));assert.ok(docs.some(d=>d.family==='degree-application-scope'));
 assert.ok(docs.filter(d=>d.authority==='classification-only').every(d=>d.execution==='review-only'||d.execution==='deterministic-template'));
});

test('bounded lexical retrieval classifies residency language without inventing an executable rule',async()=>{
 const r=new HybridPolicyRetriever(loadPolicyRegistry());
 const out=await r.search({text:'At least 15 credits must be completed in residence at the University',campus:'UMNTC',limit:3});
 assert.equal(out.mode,'bounded-lexical');assert.equal(out.matches[0]?.family,'residency');assert.equal(out.matches[0]?.execution,'review-only');assert.equal(out.matches[0]?.authority,'classification-only');
});

test('metadata hard filter excludes incompatible campus-scoped documents',async()=>{
 const docs:PolicyDocument[]=[{id:'tc',title:'TC',text:'residency credits',family:'residency',scope:{campus:'UMNTC'},sourceType:'internal-contract',sourceRef:'x',authority:'classification-only',execution:'review-only'},{id:'dl',title:'DL',text:'residency credits',family:'residency',scope:{campus:'UMNDL'},sourceType:'internal-contract',sourceRef:'x',authority:'classification-only',execution:'review-only'}];
 const out=await new HybridPolicyRetriever(docs).search({text:'residency credits',campus:'UMNTC'});
 assert.deepEqual(out.matches.map(x=>x.id),['tc']);
});

test('lightweight embedding only reranks lexical candidates and cannot promote execution authority',async()=>{
 const docs:PolicyDocument[]=[
  {id:'a',title:'Permission',text:'approval consent standing',family:'permission-standing',scope:{campus:'UMNTC'},sourceType:'internal-contract',sourceRef:'a',authority:'classification-only',execution:'review-only'},
  {id:'b',title:'Cap',text:'maximum credit limit',family:'credit-cap',scope:{campus:'UMNTC'},sourceType:'internal-contract',sourceRef:'b',authority:'classification-only',execution:'review-only'}
 ];
 const fake:Embedder={async embed(texts){return texts.map(t=>t.includes('maximum')||t.includes('limit')?[1,0]:[0,1]);}};
 const out=await new HybridPolicyRetriever(docs,fake).search({text:'maximum credits need approval',campus:'UMNTC',limit:2});
 assert.equal(out.mode,'bounded-lexical+minilm');assert.equal(out.matches[0].id,'b');assert.ok(out.matches.every(x=>x.execution==='review-only'));
});

test('JEV policy snapshots become review-only official evidence chunks',()=>{const docs=policyDocumentsFromSnapshots([{url:'https://policy.umn.edu/education/test',title:'Official test policy',text:'First policy paragraph about degree credit.\nSecond paragraph about residency and GPA.',sourceHash:'abc',scope:{campus:'UMNTC'}}]);assert.ok(docs.length);assert.ok(docs.every(d=>d.sourceType==='official-umn'&&d.authority==='classification-only'&&d.execution==='review-only'));assert.ok(docs.every(d=>d.scope.campus==='UMNTC'));});

test('JEV policy source allowlist accepts only HTTPS UMN hosts',()=>{assert.equal(allowedPolicySource('https://policy.umn.edu/education').hostname,'policy.umn.edu');assert.throws(()=>allowedPolicySource('http://policy.umn.edu/education'));assert.throws(()=>allowedPolicySource('https://example.com/policy'));});

test('tokenization is bounded and strips common filler',()=>{const t=tokenize('The credits in the major must be completed in residence');assert.ok(t.includes('credits'));assert.ok(t.includes('residence'));assert.ok(!t.includes('the'));assert.ok(t.length<512);});
