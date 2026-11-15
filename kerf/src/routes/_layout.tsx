import Analytics from '#/components/Analytics';
import type {LoadArgs,RouteProps,Meta} from '@kerf-js/start';
import {indexableSite} from '#/lib/seo';
import {currentPath} from '@kerf-js/start';
import {derived,onMount,watch} from '@kerf-js/core';
import {getPublicContent} from '#/server/public';
import {shellContent} from '#/lib/public-view';
import {requirePreviewAccess} from '#/server/preview-access';
import {activeHero} from '#/lib/hero';
import {themeStyle} from '#/lib/theme';
import SiteFrame from '#/components/navigation/SiteFrame';
import Hero from '#/components/Hero';
import Footer from '#/components/Footer';
import RouteEffects from '#/components/RouteEffects';
import {NavigationProgress} from '#/components/navigation/NavigationProvider';
import CanvasScrollbar from '#/components/CanvasScrollbar';
import MediaDownload from '#/components/MediaDownload';
import '#/styles/globals.css';
import '#/styles/navigation.css';
import '#/styles/effects.css';
export const load=async({request}:LoadArgs)=>{if(!new URL(request.url).pathname.startsWith('/admin'))await requirePreviewAccess(request);return {content:shellContent(await getPublicContent(request)),analyticsAllowed:indexableSite()};};
export const meta:Meta<typeof load>=({data})=>({extra:[...(!indexableSite()?[{name:'robots',content:'noindex, nofollow'}]:[]),...(data.content.integrations.googleSiteVerification?[{name:'google-site-verification',content:data.content.integrations.googleSiteVerification}]:[])]});
export default function Root(props:RouteProps<typeof load>){
 const hero=derived(()=>activeHero(props.data.content,'nfts'));
 const theme=derived(()=>themeStyle(props.data.content.theme));
 // The theme also lives on :root, so html-level rules (accent-color, the native
 // scrollbar) and the global overlays (cursor, scroll rail, Save dialog) follow
 // the saved theme rather than the CSS defaults. Removed again on change/cleanup.
 onMount(()=>watch(()=>theme.value,vars=>{const root=document.documentElement.style;const entries=Object.entries(vars).filter((e):e is [string,string|number]=>e[1]!==undefined);for(const [k,v] of entries)root.setProperty(k,String(v));return ()=>{for(const [k] of entries)root.removeProperty(k);};}));
 const routes=derived(()=>props.data.content.pages.map(p=>({href:`/${p.slug}`,label:p.title,kind:'article' as const,wide:p.layout==='archive',splash:['splash','split-splash'].includes(p.layout)})));
 return <><Analytics content={props.data.content} allowed={props.data.analyticsAllowed}/><a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-5 focus:z-50">Skip to artwork</a><RouteEffects/><NavigationProgress/><CanvasScrollbar/><MediaDownload/>{currentPath().startsWith('/admin')?props.children:<SiteFrame navigation={props.data.content.navigation} style={theme.value} motion={props.data.content.theme.motion} routes={routes.value} hasHero={!!hero.value} hero={hero.value&&<Hero section={hero.value.section} item={hero.value.item}/>} footer={<Footer/>}>{props.children}</SiteFrame>}</>;
}
