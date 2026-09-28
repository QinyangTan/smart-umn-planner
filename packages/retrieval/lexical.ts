import {createHash} from 'node:crypto';

export type PolicyScope={campus?:string;college?:string;program?:string;catalogYear?:string};
export type PolicyDocument={
 id:string;title:string;text:string;family:string;scope:PolicyScope;
 sourceType:'internal-contract'|'official-umn';sourceRef:string;
 authority:'classification-only'|'verified-policy';execution:'review-only'|'deterministic-template';
};
export type PolicyQuery={text:string;campus?:string;college?:string;program?:string;catalogYear?:string;limit?:number};
export type PolicyMatch={id:string;title:string;family:string;sourceType:PolicyDocument['sourceType'];sourceRef:string;authority:PolicyDocument['authority'];execution:PolicyDocument['execution'];score:number;lexicalScore:number;semanticScore?:number;matchedTerms:string[]};
export type RetrievalResult={mode:'bounded-lexical'|'bounded-lexical+minilm';matches:PolicyMatch[];queryFingerprint:string};

const stop=new Set('a an and are as at be by for from has have in into is it of on or that the their this to with your'.split(' '));
export function tokenize(input:string):string[]{return input.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+.-]+/g,' ').trim().split(/\s+/).filter(t=>t.length>1&&!stop.has(t)).slice(0,512);}
function scopeMatches(doc:PolicyDocument,q:PolicyQuery){for(const key of ['campus','college','program','catalogYear'] as const){const wanted=q[key],got=doc.scope[key];if(wanted&&got&&wanted.toLowerCase()!==got.toLowerCase())return false;}return true;}
function phraseBonus(query:string,text:string){const q=tokenize(query),t=text.toLowerCase();let bonus=0;for(let i=0;i<q.length-1;i++)if(t.includes(q[i]+' '+q[i+1]))bonus+=0.18;return Math.min(.72,bonus);}
function lexicalScores(docs:PolicyDocument[],query:string){const q=tokenize(query),N=Math.max(1,docs.length),df=new Map<string,number>();for(const d of docs){const seen=new Set(tokenize(d.title+' '+d.text));for(const x of seen)df.set(x,(df.get(x)||0)+1);}return docs.map(doc=>{const toks=tokenize(doc.title+' '+doc.text),tf=new Map<string,number>();for(const t of toks)tf.set(t,(tf.get(t)||0)+1);let score=0;const matched:string[]=[];for(const term of q){const n=tf.get(term)||0;if(!n)continue;matched.push(term);const idf=Math.log(1+(N-(df.get(term)||0)+.5)/((df.get(term)||0)+.5));score+=idf*(n*(1.2+1))/(n+1.2*(.25+.75*Math.max(1,toks.length)/80));}score+=phraseBonus(query,doc.title+' '+doc.text);return{doc,score,matchedTerms:[...new Set(matched)]};}).sort((a,b)=>b.score-a.score||a.doc.id.localeCompare(b.doc.id));}
function cosine(a:number[],b:number[]){let d=0,aa=0,bb=0;for(let i=0;i<Math.min(a.length,b.length);i++){d+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return aa&&bb?d/Math.sqrt(aa*bb):0;}

export interface Embedder{embed(texts:string[]):Promise<number[][]>;}
export class HybridPolicyRetriever{
 private vectors=new Map<string,number[]>();documents:PolicyDocument[];embedder?:Embedder;
 constructor(documents:PolicyDocument[],embedder?:Embedder){this.documents=documents;this.embedder=embedder;}
 async search(query:PolicyQuery):Promise<RetrievalResult>{return(await this.searchMany([query]))[0];}
 async searchMany(queries:PolicyQuery[]):Promise<RetrievalResult[]>{
  const prepared=queries.map(query=>{const filtered=this.documents.filter(d=>scopeMatches(d,query)),lexical=lexicalScores(filtered,query.text),candidate=lexical.slice(0,Math.min(40,Math.max(query.limit||5,12)));return{query,candidate};});
  let semantic=false,queryVectors:(number[]|undefined)[]=prepared.map(()=>undefined);
  if(this.embedder&&prepared.some(x=>x.candidate.length)){
   try{
    const active=prepared.map((x,i)=>x.candidate.length?i:-1).filter(i=>i>=0),vecs=await this.embedder.embed(active.map(i=>prepared[i].query.text));active.forEach((index,i)=>queryVectors[index]=vecs[i]);
    const missingById=new Map<string,PolicyDocument>();for(const {candidate}of prepared)for(const x of candidate)if(!this.vectors.has(x.doc.id))missingById.set(x.doc.id,x.doc);
    const missing=[...missingById.values()];if(missing.length){const docVecs=await this.embedder.embed(missing.map(x=>x.title+'\n'+x.text));missing.forEach((x,i)=>this.vectors.set(x.id,docVecs[i]));}
    semantic=active.every(i=>!!queryVectors[i]);
   }catch{semantic=false;queryVectors=prepared.map(()=>undefined);}
  }
  return prepared.map(({query,candidate},index)=>{const queryVec=queryVectors[index],maxLex=Math.max(1e-9,...candidate.map(x=>x.score));const matches=candidate.map(x=>{const lex=Math.max(0,x.score/maxLex),sem=semantic&&queryVec?Math.max(0,cosine(queryVec,this.vectors.get(x.doc.id)||[])):undefined;const score=sem===undefined?lex:.62*lex+.38*sem;return{id:x.doc.id,title:x.doc.title,family:x.doc.family,sourceType:x.doc.sourceType,sourceRef:x.doc.sourceRef,authority:x.doc.authority,execution:x.doc.execution,score:Number(score.toFixed(4)),lexicalScore:Number(lex.toFixed(4)),...(sem!==undefined?{semanticScore:Number(sem.toFixed(4))}:{}),matchedTerms:x.matchedTerms};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.max(1,Math.min(10,query.limit||5)));return{mode:semantic&&queryVec?'bounded-lexical+minilm':'bounded-lexical',matches,queryFingerprint:createHash('sha256').update(query.text).digest('hex').slice(0,12)};});
 }
}
