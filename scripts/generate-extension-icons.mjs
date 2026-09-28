import{mkdir,writeFile}from'node:fs/promises';
import{join}from'node:path';

const table=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=(buf)=>{let c=0xffffffff;for(const b of buf)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const adler32=(buf)=>{let a=1,b=0;for(const value of buf){a=(a+value)%65521;b=(b+a)%65521;}return((b<<16)|a)>>>0;};
// Use uncompressed DEFLATE blocks instead of Node/zlib so PNG bytes are identical across OS/zlib versions.
const zlibStore=(buf)=>{const parts=[Buffer.from([0x78,0x01])];for(let offset=0;offset<buf.length;){const len=Math.min(65535,buf.length-offset),final=offset+len===buf.length,header=Buffer.alloc(5);header[0]=final?1:0;header.writeUInt16LE(len,1);header.writeUInt16LE((~len)&0xffff,3);parts.push(header,buf.subarray(offset,offset+len));offset+=len;}const checksum=Buffer.alloc(4);checksum.writeUInt32BE(adler32(buf),0);parts.push(checksum);return Buffer.concat(parts);};
const chunk=(type,data)=>{const name=Buffer.from(type),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),8+data.length);return out;};
function png(size,pixels){const raw=Buffer.alloc(size*(size*4+1));for(let y=0;y<size;y++){const row=y*(size*4+1);raw[row]=0;pixels.copy(raw,row+1,y*size*4,(y+1)*size*4);}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlibStore(raw)),chunk('IEND',Buffer.alloc(0))]);}
const color=(hex,a=255)=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),a];
const MAROON=color('#6d001f'),GOLD=color('#ffcc33'),CREAM=color('#fffdf7');
function paint(size){
 const px=Buffer.alloc(size*size*4);
 const put=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=size||y>=size)return;const i=(y*size+x)*4;px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];px[i+3]=c[3];};
 const padding=Math.max(1,Math.round(size*.125)),left=padding,top=padding,right=size-padding-1,bottom=size-padding-1,r=Math.max(2,Math.round(size*.16));
 const inside=(x,y)=>{if(x<left||x>right||y<top||y>bottom)return false;const cx=x<left+r?left+r:x>right-r?right-r:x,cy=y<top+r?top+r:y>bottom-r?bottom-r:y;return(x-cx)**2+(y-cy)**2<=r*r;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(inside(x,y))put(x,y,MAROON);
 const circle=(cx,cy,rad,c)=>{for(let y=Math.floor(cy-rad);y<=Math.ceil(cy+rad);y++)for(let x=Math.floor(cx-rad);x<=Math.ceil(cx+rad);x++)if((x-cx)**2+(y-cy)**2<=rad*rad)put(x,y,c);};
 const line=(a,b,width,c)=>{const dx=b[0]-a[0],dy=b[1]-a[1],steps=Math.max(Math.abs(dx),Math.abs(dy),1)*2;for(let i=0;i<=steps;i++){const t=i/steps;circle(a[0]+dx*t,a[1]+dy*t,width/2,c);}};
 const p1=[size*.32,size*.69],p2=[size*.50,size*.54],p3=[size*.69,size*.33],lineW=Math.max(1,size*.065),outer=Math.max(1.4,size*.095),inner=Math.max(.7,size*.04);
 line(p1,p2,lineW,GOLD);line(p2,p3,lineW,GOLD);
 for(const p of[p1,p2,p3]){circle(p[0],p[1],outer,GOLD);circle(p[0],p[1],inner,CREAM);}
 return px;
}
function promoPixels(width=440,height=280){
 const px=Buffer.alloc(width*height*4),bg=color('#6d001f'),gold=color('#ffcc33'),cream=color('#fffdf7');
 const put=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=width||y>=height)return;const i=(y*width+x)*4;px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];px[i+3]=c[3];};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)put(x,y,bg);
 const circle=(cx,cy,rad,c)=>{for(let y=Math.floor(cy-rad);y<=Math.ceil(cy+rad);y++)for(let x=Math.floor(cx-rad);x<=Math.ceil(cx+rad);x++)if((x-cx)**2+(y-cy)**2<=rad*rad)put(x,y,c);};
 const line=(a,b,w,c)=>{const dx=b[0]-a[0],dy=b[1]-a[1],steps=Math.max(Math.abs(dx),Math.abs(dy),1)*2;for(let i=0;i<=steps;i++){const t=i/steps;circle(a[0]+dx*t,a[1]+dy*t,w/2,c);}};
 const pts=[[88,198],[190,142],[338,72]];line(pts[0],pts[1],18,gold);line(pts[1],pts[2],18,gold);
 for(const p of pts){circle(p[0],p[1],28,gold);circle(p[0],p[1],12,cream);}
 // Small independent-product marker, intentionally not an official UMN logo.
 for(let y=44;y<58;y++)for(let x=44;x<58;x++)put(x,y,gold);
 return px;
}
function pngWH(width,height,pixels){const raw=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++){const row=y*(width*4+1);raw[row]=0;pixels.copy(raw,row+1,y*width*4,(y+1)*width*4);}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlibStore(raw)),chunk('IEND',Buffer.alloc(0))]);}
export async function generateExtensionIcons(dir){await mkdir(dir,{recursive:true});for(const size of[16,32,48,128])await writeFile(join(dir,`icon${size}.png`),png(size,paint(size)));}
export async function generateStorePromo(path){await mkdir(join(path,'..'),{recursive:true});await writeFile(path,pngWH(440,280,promoPixels()));}
if(typeof process!=='undefined'&&process.argv?.[1]&&import.meta.url===new URL(process.argv[1],`file://${process.cwd()}/`).href){await generateExtensionIcons(process.argv[2]||'dist/extension/icons');if(process.argv[3])await generateStorePromo(process.argv[3]);}
