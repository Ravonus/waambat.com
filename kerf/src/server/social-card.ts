import {readCardImage} from './card-image';
import {createHash} from 'node:crypto';
import type {Content} from '../lib/content';
import {cardSpec,cardVersion} from '../lib/site-settings';
import {pageDescription,siteDescription} from '../lib/seo';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const lines=(value:string,width:number,max:number)=>{const result:string[]=[];let line='';for(const word of value.split(/\s+/)){if((line+' '+word).trim().length>width&&line){result.push(line);line='';}line+=(line?' ':'')+word;}if(line)result.push(line);return result.slice(0,max);};
async function localImage(url:string,fallback:string,width:number,height:number){
 const {default:sharp}=await import('sharp');
 let bytes:Buffer;try{bytes=await readCardImage(url);}catch{bytes=await readCardImage(fallback);}
 return `data:image/png;base64,${(await sharp(bytes).resize(width,height,{fit:'cover'}).png().toBuffer()).toString('base64')}`;
}
/** Card input is selected only from the current published snapshot. Drafts never enter this route. */
export function publishedCard(content:Content,path:string){
 const page=content.pages.find(p=>`/${p.slug}`===path&&!p.archived&&!p.seo.noIndex&&!['splash','split-splash'].includes(p.layout));
 if(path!=='/'&&path!=='/ordinals'&&!page)return null;
 const title=path==='/'?content.seo.homeTitle:path==='/ordinals'?'Ordinals':page!.seo.title||page!.title;
 const description=path==='/'?content.seo.description:path==='/ordinals'?siteDescription:pageDescription(page!);
 return cardSpec(content,path,title,description);
}
export async function socialCardResponse(request:Request,content:Content){
 const url=new URL(request.url),spec=publishedCard(content,url.searchParams.get('path')||'/');
 if(!spec)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const version=cardVersion(spec);
 if(url.searchParams.get('v')&&url.searchParams.get('v')!==version){const next=new URL('/social-card.jpg',url.origin);next.searchParams.set('path',spec.path);next.searchParams.set('v',version);return new Response(null,{status:307,headers:{Location:next.href,'Cache-Control':'no-cache'}});}
 const artist=await localImage(spec.artist,'/hero/waambat-hero-loop-poster.webp',560,630);
 const logo=await localImage(spec.logo,'/brand/waambat-sigil-original.svg',92,96);
 const title=lines(spec.title,25,3),desc=lines(spec.description,44,3);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#050505"/><image href="${artist}" x="640" width="560" height="630"/><image href="${logo}" x="48" y="38" width="76" height="79"/><g font-family="Arial,Helvetica,sans-serif"><text x="143" y="88" font-size="32" letter-spacing="3" fill="${spec.accent}">WAAMBAT</text>${title.map((line,i)=>`<text x="48" y="${200+i*60}" font-size="49" font-weight="700" fill="${spec.accent}">${escape(line)}</text>`).join('')}${desc.map((line,i)=>`<text x="48" y="${430+i*30}" font-size="23" fill="#dfc2cc">${escape(line)}</text>`).join('')}<text x="48" y="584" font-size="22" fill="${spec.accent}">WAAMB.AT · Lindsay Scoggins</text></g></svg>`;
 const {default:sharp}=await import('sharp');
 const image=await sharp(Buffer.from(svg)).jpeg({quality:88,mozjpeg:true}).toBuffer();
 const etag='"'+createHash('sha256').update(image).digest('hex')+'"';
 const headers={'Content-Type':'image/jpeg','Cache-Control':'public, no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'};
 return new Response(request.method==='HEAD'||request.headers.get('if-none-match')===etag?null:new Uint8Array(image),{status:request.headers.get('if-none-match')===etag?304:200,headers});
}
