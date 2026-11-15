import {requirePreviewAccess} from '#/server/preview-access';
import {indexableSite,publicPaths,siteOrigin} from '#/lib/seo';
import {getPublishedContent} from '#/server/content';
import type {ServerExtension} from '@kerf-js/start/extension';
const endpoints:Record<string,()=>Promise<object>>={
 contact:()=>import('./http/contact'), 'admin/content':()=>import('./http/admin-content'),
 'admin/contact':()=>import('./http/admin-contact'), 'admin/upload':()=>import('./http/admin-upload'),
 'admin/export':()=>import('./http/admin-export'), 'admin/email-preview':()=>import('./http/admin-email-preview'),
};
export const extension=():ServerExtension=>({async handle(request,path){
 if(path==='social-card'){await requirePreviewAccess(request);const {socialCardResponse}=await import('#/server/social-card');return socialCardResponse(request,await getPublishedContent());}
 if(path==='robots'){return new Response(indexableSite()?`User-agent: *\nAllow: /\nAllow: /api/media/\nDisallow: /admin\nDisallow: /api/\nDisallow: /_kerf/\nSitemap: ${siteOrigin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});}
 if(path==='sitemap'){const paths=indexableSite()?publicPaths(await getPublishedContent()):[];return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${new URL(path,siteOrigin).href.replace(/&/g,'&amp;')}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});}
 const mediaId=path.match(/^media\/([a-f0-9]{64})$/)?.[1];
 if(mediaId){const media=await import('./http/media-id');return (request.method==='HEAD'?media.HEAD:media.GET)(request,{params:Promise.resolve({id:mediaId})});}
 const load=endpoints[path.replace(/^\//,'')];const endpoint=(load?await load():undefined) as Record<string,((request:Request)=>Promise<Response>)>|undefined;
 const action=endpoint?.[request.method];return action?action(request):new Response(null,{status:endpoint?405:404});
}});
