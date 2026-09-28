import{createHash}from'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {PolicyDocument} from './lexical.ts';

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
const policySources=JSON.parse(readFileSync(new URL('../../config/policy-sources.json',import.meta.url),'utf8')) as {id:string;url:string;scope:Record<string,string>}[];
export function policyDocumentsFromSnapshots(snapshots:any[],now=Date.now()):PolicyDocument[]{const out:PolicyDocument[]=[];for(const snap of snapshots){if(!snap||typeof snap.text!=='string'||snap.text.length>500000||typeof snap.url!=='string')continue;const source=policySources.find(s=>s.id===snap.sourceId&&s.url===snap.url),age=now-Date.parse(snap.capturedAt);if(!source||!Number.isFinite(age)||age<0||age>7*86400000||snap.sourceHash!==createHash('sha256').update(snap.text).digest('hex'))continue;const paragraphs=snap.text.split(/\n+/).map((x:string)=>x.trim()).filter(Boolean);let current='';let part=0;const push=()=>{const text=current.trim();if(!text)return;out.push({id:`jev:${snap.sourceHash||'unknown'}:${part++}`,title:String(snap.title||'UMN public policy source'),text,family:'official-policy-source',scope:source.scope,sourceType:'official-umn',sourceRef:String(snap.url),authority:'classification-only',execution:'review-only'});current='';};for(const p of paragraphs){if(current&&current.length+p.length+1>1200)push();current+=(current?'\n':'')+p;}push();}return out;}
