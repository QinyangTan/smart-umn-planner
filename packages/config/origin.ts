/** One exact planner origin owns the academic bridge. Never accept wildcards. */
export function plannerOrigin(value:string):string {
 const u=new URL(value);
 const loopback=u.hostname==='127.0.0.1'||u.hostname==='localhost';
 if((u.protocol!=='https:'&&!(u.protocol==='http:'&&loopback))||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Planner origin must be an HTTPS origin or HTTP loopback origin');
 return u.origin;
}
declare const __SMART_UMN_WEB_ORIGIN__:string;
export const WEB_ORIGIN=plannerOrigin(typeof __SMART_UMN_WEB_ORIGIN__==='string'?__SMART_UMN_WEB_ORIGIN__:'http://127.0.0.1:4317');
