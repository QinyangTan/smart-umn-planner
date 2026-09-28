import {HybridPolicyRetriever,type Embedder,type PolicyDocument} from './lexical.ts';
import {MiniLMEmbedder} from './policy.ts';
export {loadPolicyRegistry,policyDocumentsFromSnapshots} from './documents.ts';
import {loadPolicyRegistry} from './documents.ts';

export function createPolicyRetriever(extraDocuments:PolicyDocument[]=[],embedder?:Embedder){
 const docs=[...loadPolicyRegistry(),...extraDocuments];
 const mode=process.env.SMART_UMN_EMBEDDINGS||'auto';
 return new HybridPolicyRetriever(docs,embedder??(mode==='off'?undefined:new MiniLMEmbedder(undefined,mode==='download')));
}
