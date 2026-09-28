import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {HybridPolicyRetriever,MiniLMEmbedder,type Embedder,type PolicyDocument} from './policy.ts';

export function loadPolicyRegistry(path=resolve('config/policy-semantic-registry.json')):PolicyDocument[]{
 const parsed=JSON.parse(readFileSync(path,'utf8'));
 if(!Array.isArray(parsed))throw Error('Policy semantic registry must be an array');
 const ids=new Set<string>();
 return parsed.map((x:any)=>{
  if(!x||typeof x!=='object'||typeof x.id!=='string'||typeof x.title!=='string'||typeof x.text!=='string'||typeof x.family!=='string')throw Error('Invalid policy semantic registry entry');
  if(ids.has(x.id))throw Error('Duplicate policy semantic registry id: '+x.id);ids.add(x.id);
  if(!['internal-contract','official-umn'].includes(x.sourceType))throw Error('Invalid policy source type');
  if(!['classification-only','verified-policy'].includes(x.authority))throw Error('Invalid policy authority');
  if(!['review-only','deterministic-template'].includes(x.execution))throw Error('Invalid policy execution mode');
  return x as PolicyDocument;
 });
}
export function policyDocumentsFromSnapshots(snapshots:any[]):PolicyDocument[]{const out:PolicyDocument[]=[];for(const snap of snapshots){if(!snap||typeof snap.text!=='string'||typeof snap.url!=='string')continue;const paragraphs=snap.text.split(/\n+/).map((x:string)=>x.trim()).filter(Boolean);let current='';let part=0;const push=()=>{const text=current.trim();if(!text)return;out.push({id:`jev:${snap.sourceHash||'unknown'}:${part++}`,title:String(snap.title||'UMN public policy source'),text,family:'official-policy-source',scope:snap.scope&&typeof snap.scope==='object'?snap.scope:{},sourceType:'official-umn',sourceRef:String(snap.url),authority:'classification-only',execution:'review-only'});current='';};for(const p of paragraphs){if(current&&current.length+p.length+1>1200)push();current+=(current?'\n':'')+p;}push();}return out;}
export function createPolicyRetriever(extraDocuments:PolicyDocument[]=[],embedder?:Embedder){
 const docs=[...loadPolicyRegistry(),...extraDocuments];
 const mode=process.env.SMART_UMN_EMBEDDINGS||'auto';
 return new HybridPolicyRetriever(docs,embedder??(mode==='off'?undefined:new MiniLMEmbedder(undefined,mode==='download')));
}
