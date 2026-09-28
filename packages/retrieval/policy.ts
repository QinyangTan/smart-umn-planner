import type {FeatureExtractionPipeline} from '@huggingface/transformers';
import type {Embedder} from './lexical.ts';
export * from './lexical.ts';

export class MiniLMEmbedder implements Embedder{
 private extractor?:FeatureExtractionPipeline;private failed=false;model:string;allowDownload:boolean;
 constructor(model=process.env.SMART_UMN_EMBEDDING_MODEL||'onnx-community/all-MiniLM-L6-v2-ONNX',allowDownload=process.env.SMART_UMN_EMBEDDINGS==='download'){this.model=model;this.allowDownload=allowDownload;}
 private async get(){if(this.failed)throw Error('MiniLM unavailable');try{if(this.extractor)return this.extractor;const{pipeline}=await import('@huggingface/transformers');return this.extractor=await pipeline('feature-extraction',this.model,{dtype:'q4',device:'cpu',cache_dir:'var/models',local_files_only:!this.allowDownload});}catch(e){this.failed=true;throw e;}}
 async embed(texts:string[]){const out=await (await this.get())(texts,{pooling:'mean',normalize:true});return out.tolist() as number[][];}
}
