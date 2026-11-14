import {indexableSite,publicPaths,siteOrigin} from '#/lib/seo';
import {getPublishedContent} from '#/server/content';
import type {ServerExtension} from '@kerf-js/start/extension';
import * as contact from './http/contact';
import * as content from './http/admin-content';
import * as inbox from './http/admin-contact';
import * as upload from './http/admin-upload';
import * as exported from './http/admin-export';
import * as mail from './http/admin-email-preview';
import * as media from './http/media-id';
const endpoints:Record<string,object>={'contact':contact,'admin/content':content,'admin/contact':inbox,'admin/upload':upload,'admin/export':exported,'admin/email-preview':mail};
export const extension=():ServerExtension=>({async handle(request,path){
 if(path==='robots'){return new Response(indexableSite()?`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /_kerf/\nSitemap: ${siteOrigin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});}
 if(path==='sitemap'){const paths=indexableSite()?publicPaths(await getPublishedContent()):[];return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${new URL(path,siteOrigin).href.replace(/&/g,'&amp;')}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});}
 const mediaId=path.match(/^media\/([a-f0-9]{64})$/)?.[1];
 if(mediaId)return (request.method==='HEAD'?media.HEAD:media.GET)(request,{params:Promise.resolve({id:mediaId})});
 const endpoint=endpoints[path.replace(/^\//,'')] as Record<string,((request:Request)=>Promise<Response>)>|undefined;
 const action=endpoint?.[request.method];return action?action(request):new Response(null,{status:endpoint?405:404});
}});
