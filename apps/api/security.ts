import type {IncomingMessage} from 'node:http';
import {plannerOrigin} from '../../packages/config/origin.ts';
export function serverConfig(env:NodeJS.ProcessEnv=process.env){
 const port=Number(env.PORT||4317);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 const production=env.NODE_ENV==='production';
 if(production&&!env.PUBLIC_ORIGIN)throw Error('PUBLIC_ORIGIN is required in production');
 const origin=plannerOrigin(env.PUBLIC_ORIGIN||`http://127.0.0.1:${port}`);
 if(production&&!origin.startsWith('https://'))throw Error('Production requires HTTPS PUBLIC_ORIGIN');
 const extensionIds=(env.EXTENSION_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(extensionIds.some(x=>! /^[a-p]{32}$/.test(x)))throw Error('Invalid EXTENSION_IDS');
 const hosts=new Set([new URL(origin).host,...(!production?[`127.0.0.1:${port}`,`localhost:${port}`]:[])]);
 const origins=new Set([origin,...(!production?[`http://127.0.0.1:${port}`,`http://localhost:${port}`]:[]),...extensionIds.map(id=>`chrome-extension://${id}`)]);
 return {port,production,origin,hosts,origins,bind:env.BIND_HOST||'127.0.0.1'};
}
export type ServerConfig=ReturnType<typeof serverConfig>;
export function requestAllowed(req:IncomingMessage,c:ServerConfig):boolean{
 if(!c.hosts.has(req.headers.host||''))return false;
 const origin=req.headers.origin;
 if(origin&&!c.origins.has(origin)&&!(!c.production&&/^chrome-extension:\/\/[a-p]{32}$/.test(origin)))return false;
 // Extension requests without Origin use the standard extension Fetch Metadata.
 // Cross-site browser requests without a recognized Origin are never accepted.
 if(req.headers['sec-fetch-site']==='cross-site'&&!origin)return false;
 return true;
}
export class RequestBudget {
 private counts=new Map<string,{start:number;count:number}>();
 private global={start:0,count:0};
 readonly perMinute:number;readonly totalPerMinute:number;readonly maximumKeys:number;
 constructor(perMinute=120,totalPerMinute=600,maximumKeys=4096){this.perMinute=perMinute;this.totalPerMinute=totalPerMinute;this.maximumKeys=maximumKeys;}
 take(key:string,now=Date.now()):boolean{
  if(now-this.global.start>=60000)this.global={start:now,count:0};
  if(++this.global.count>this.totalPerMinute)return false;
  let entry=this.counts.get(key);
  if(!entry||now-entry.start>=60000){
   if(!entry&&this.counts.size>=this.maximumKeys){for(const[k,v]of this.counts)if(now-v.start>=60000)this.counts.delete(k);if(this.counts.size>=this.maximumKeys)return false;}
   entry={start:now,count:0};this.counts.set(key,entry);
  }
  return ++entry.count<=this.perMinute;
 }
}
export class RequestError extends Error {readonly status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export async function readJSON(req:IncomingMessage,limit=32768):Promise<unknown>{
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new RequestError(415,'JSON required');
 if(Number(req.headers['content-length'])>limit)throw new RequestError(413,'Request too large');
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>limit)throw new RequestError(413,'Request too large');chunks.push(b);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new RequestError(400,'Invalid JSON');}
}
