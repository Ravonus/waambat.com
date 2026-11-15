export type DownloadFile={src:string;name:string;type:string;bytes:number;original?:string;originalSrc?:string;originalName?:string;originalBytes?:number};
export type DownloadCatalog={files:Record<string,DownloadFile>;artworks:Record<string,string>};
type Request={kind:string;sources:string[];owner?:string;artwork?:string;baseURL:string};
const MIME:Record<string,string>={mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',avif:'image/avif',gif:'image/gif',svg:'image/svg+xml'};
function candidates(source:string,base:string){
 try{const url=new URL(source,base),local=new URL(base);return [...new Set([source,url.href,...(url.origin===local.origin||url.hostname==='waamb.at'?[url.pathname+url.search,url.pathname]:[])])];}catch{return [source];}
}
/** Resolve previews and absolute browser URLs back to an exact original, including partial-build catalogs. */
export function resolveMediaDownload(catalog:DownloadCatalog,request:Request):DownloadFile|undefined{
 const lookup=(source:string)=>candidates(source,request.baseURL).map(key=>catalog.files[key]).find(Boolean);
 const owner=request.owner||catalog.artworks[request.artwork??'']||'',owned=owner?lookup(owner):undefined;
 // A poster is the movie's loading state; right-clicking it must still save the complete movie.
 if(owned?.type.startsWith('video/'))return owned;
 const movieOwner=!!owner&&(/\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(owner)||/^https:\/\/(?:[^/]+\.)?(vimeo\.com|youtube\.com|youtu\.be)\//i.test(owner));
 if(movieOwner&&!owned){
  try{const url=new URL(owner,request.baseURL),extension=url.pathname.split('.').at(-1)?.toLowerCase()??'',type=MIME[extension];if(type?.startsWith('video/')){const name=decodeURIComponent(url.pathname.split('/').at(-1)!);return{src:url.href,name,type,bytes:0,originalSrc:url.href,originalName:name};}}catch{}
  return undefined;
 }
 for(const source of request.sources){const file=lookup(source);if(file)return file;}
 if(owned)return owned;
 for(const source of [...(request.kind==='IMG'?request.sources:[owner,...request.sources])]){
  try{
   const url=new URL(source,request.baseURL);if(!['http:','https:'].includes(url.protocol))continue;
   const ext=url.pathname.split('.').at(-1)?.toLowerCase()??'',type=MIME[ext];if(!type)continue;
   const name=decodeURIComponent(url.pathname.split('/').at(-1)||'waambat.'+ext);
   return {src:url.href,name,type,bytes:0,originalSrc:url.href,originalName:name};
  }catch{}
 }
}
