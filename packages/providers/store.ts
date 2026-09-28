import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import type {CommunityReference,ProviderHealth} from '../schemas/index.ts';
export class Store {
 db:DatabaseSync;
 constructor(path='var/planner.sqlite'){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});this.db=new DatabaseSync(path);const version=Number(this.db.prepare('PRAGMA user_version').get()?.user_version||0);if(version>1){this.db.close();throw Error('Public cache schema is newer than this build');}this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS source_snapshots(key TEXT PRIMARY KEY, source TEXT NOT NULL, retrieved_at TEXT NOT NULL, payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS provider_health(source TEXT PRIMARY KEY,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS community_references(id TEXT PRIMARY KEY, source TEXT NOT NULL, document_id TEXT, url TEXT NOT NULL UNIQUE, payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS community_entities(reference_id TEXT NOT NULL REFERENCES community_references(id), entity_id TEXT NOT NULL, PRIMARY KEY(reference_id,entity_id));
 CREATE TABLE IF NOT EXISTS crawl_jobs(entity_id TEXT PRIMARY KEY, last_checked TEXT, status TEXT NOT NULL, message TEXT);
 CREATE TABLE IF NOT EXISTS instructors(id TEXT PRIMARY KEY, internet_id TEXT UNIQUE, name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS instructor_aliases(instructor_id TEXT NOT NULL REFERENCES instructors(id),alias TEXT NOT NULL,PRIMARY KEY(instructor_id,alias)); PRAGMA user_version=1;`);}
 get(key:string):{retrievedAt:string;data:any}|undefined{const row=this.db.prepare('SELECT retrieved_at,payload FROM source_snapshots WHERE key=?').get(key);if(row)return{retrievedAt:String(row.retrieved_at),data:JSON.parse(String(row.payload))};}
 put(key:string,source:string,data:unknown,retrievedAt=new Date().toISOString()){this.db.prepare('INSERT OR REPLACE INTO source_snapshots VALUES(?,?,?,?)').run(key,source,retrievedAt,JSON.stringify(data));}
 health(h:ProviderHealth){this.db.prepare('INSERT OR REPLACE INTO provider_health VALUES(?,?)').run(h.source,JSON.stringify(h));}
 healthList(){return this.db.prepare('SELECT payload FROM provider_health').all().map(r=>JSON.parse(String(r.payload)));}
 policySnapshots():any[]{return this.db.prepare("SELECT payload FROM source_snapshots WHERE key LIKE 'policy:%' ORDER BY retrieved_at DESC").all().map(r=>JSON.parse(String(r.payload)));}
 reference(r:CommunityReference){this.db.prepare('INSERT INTO community_references VALUES(?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET payload=excluded.payload').run(r.id,r.source,r.sourceDocumentId||null,r.url,JSON.stringify(r));const found=this.db.prepare('SELECT id FROM community_references WHERE url=?').get(r.url)!;this.db.prepare('INSERT OR IGNORE INTO community_entities VALUES(?,?)').run(String(found.id),r.entityId);}
 references(entity:string):CommunityReference[]{return this.db.prepare('SELECT r.payload FROM community_references r JOIN community_entities e ON r.id=e.reference_id WHERE e.entity_id=?').all(entity).map(r=>({...JSON.parse(String(r.payload)),entityId:entity}));}
 close(){this.db.close();}
}
