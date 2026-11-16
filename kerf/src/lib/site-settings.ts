import type {Content} from './content';
export function cardSpec(content:Pick<Content,'seo'|'theme'>,path:string,title:string,description:string){return {path,title,description,artist:content.seo.artistImage,logo:content.seo.logo,accent:content.theme.heading};}
export function cardVersion(spec:ReturnType<typeof cardSpec>){let a=2166136261,b=5381;for(const c of JSON.stringify(spec)){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}return (a>>>0).toString(16)+(b>>>0).toString(16);}
export function socialImage(content:Pick<Content,'seo'|'theme'>,path:string,title:string,description:string,image=''){return image||content.seo.socialImage||`/social-card.jpg?path=${encodeURIComponent(path)}&v=${cardVersion(cardSpec(content,path,title,description))}`;}
export function artistGraph(content:Pick<Content,'seo'>){return {'@context':'https://schema.org','@graph':[{'@type':'Person','@id':'https://waamb.at/#artist',name:'Lindsay Scoggins',alternateName:'WAAMBAT',url:'https://waamb.at',image:new URL(content.seo.artistImage||'/hero/waambat-hero-loop-poster.webp','https://waamb.at').href,sameAs:['https://www.instagram.com/waambat','https://x.com/waambat','https://www.youtube.com/waambat']},{'@type':'WebSite','@id':'https://waamb.at/#website',name:'WAAMBAT',url:'https://waamb.at',image:new URL(content.seo.logo||'/brand/waambat-sigil-original.svg','https://waamb.at').href,creator:{'@id':'https://waamb.at/#artist'}}]};}

/** Current page content, linked to the artist/site graph without inventing dates or video captions. */
export function pageGraph(content:Pick<Content,'seo'|'theme'>,path:string,title:string,description:string,type='WebPage') {
 const base=artistGraph(content),url=new URL(path,'https://waamb.at').href;
 return {...base,'@graph':[...base['@graph'],{'@type':type,'@id':url+'#page',url,name:title,description,
  isPartOf:{'@id':'https://waamb.at/#website'},about:{'@id':'https://waamb.at/#artist'},
  author:{'@id':'https://waamb.at/#artist'},creator:{'@id':'https://waamb.at/#artist'},publisher:{'@id':'https://waamb.at/#artist'},
  primaryImageOfPage:{'@type':'ImageObject',url:new URL(socialImage(content,path,title,description),'https://waamb.at').href}}]};
}
export const artistMeta=[{name:'author',content:'Lindsay Scoggins (WAAMBAT)'},{name:'creator',content:'Lindsay Scoggins (WAAMBAT)'},{name:'publisher',content:'WAAMB.AT'},{name:'keywords',content:'WAAMBAT, Lindsay Scoggins, video paintings, cryptoart, Ordinals'}];
export function robotsMeta(indexable:boolean){return {name:'robots',content:indexable?'index, follow, max-image-preview:large':'noindex, nofollow'};}
