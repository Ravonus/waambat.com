import {readCardImage} from './card-image';
import {createHash} from 'node:crypto';
import type {Content} from '../lib/content';
import {cardSpec,cardVersion} from '../lib/site-settings';
import {pageDescription,siteDescription} from '../lib/seo';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const lines=(value:string,width:number,max:number)=>{const result:string[]=[];let line='';for(const word of value.split(/\s+/)){if((line+' '+word).trim().length>width&&line){result.push(line);line='';}line+=(line?' ':'')+word;}if(line)result.push(line);return result.slice(0,max);};
// A stable font set reuses Kerf's renderer and its bundled Geist font on Lambda.
const cardFonts: {name:string;data:Uint8Array}[]=[];
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
 const html=`<div style="position:relative;width:1200px;height:630px;background-color:#050505;color:${spec.accent};font-family:Geist"><img src="${artist}" width="560" height="630" style="position:absolute;left:640px;top:0;width:560px;height:630px"/><img src="${logo}" width="76" height="79" style="position:absolute;left:48px;top:38px;width:76px;height:79px"/><div style="position:absolute;left:143px;top:56px;font-size:32px;line-height:38px;letter-spacing:3px">WAAMBAT</div>${title.map((line,i)=>`<div style="position:absolute;left:48px;top:${151+i*60}px;font-size:49px;line-height:60px;font-weight:700">${escape(line)}</div>`).join('')}${desc.map((line,i)=>`<div style="position:absolute;left:48px;top:${406+i*30}px;font-size:23px;line-height:30px;color:#dfc2cc">${escape(line)}</div>`).join('')}<div style="position:absolute;left:48px;top:562px;font-size:22px;line-height:26px">WAAMB.AT · Lindsay Scoggins</div></div>`;
 const {renderCard}=await import('@kerf-js/start/og');
 const {default:sharp}=await import('sharp');
 const image=await sharp(await renderCard(html,{width:1200,height:630},cardFonts)).jpeg({quality:88,mozjpeg:true}).toBuffer();
 const etag='"'+createHash('sha256').update(image).digest('hex')+'"';
 const headers={'Content-Type':'image/jpeg','Cache-Control':'public, no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'};
 return new Response(request.method==='HEAD'||request.headers.get('if-none-match')===etag?null:new Uint8Array(image),{status:request.headers.get('if-none-match')===etag?304:200,headers});
}
