import {MiniLMEmbedder} from '../packages/retrieval/policy.ts';
const model=process.env.SMART_UMN_EMBEDDING_MODEL||'onnx-community/all-MiniLM-L6-v2-ONNX';
const embedder=new MiniLMEmbedder(model,true);
const started=Date.now(),vectors=await embedder.embed(['UMN degree residency policy','upper division course requirement']);
if(vectors.length!==2||!vectors[0]?.length)throw Error('Embedding warmup returned no vectors');
console.log(JSON.stringify({model,dimensions:vectors[0].length,cache:'var/models',elapsedMs:Date.now()-started},null,2));
