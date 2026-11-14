import type {LoadArgs,RouteProps} from '@kerf-js/start';
import {indexableSite} from '#/lib/seo';
import {currentPath} from '@kerf-js/start';
import {derived} from '@kerf-js/core';
import {getPublicContent} from '#/server/public';
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
export const load=async({request}:LoadArgs)=>{if(!new URL(request.url).pathname.startsWith('/admin'))await requirePreviewAccess(request);return {content:await getPublicContent(request)};};
export const meta=()=>({extra:!indexableSite()?[{name:'robots',content:'noindex, nofollow'}]:[]});
export default function Root(props:RouteProps<typeof load>){
 const hero=derived(()=>activeHero(props.data.content,'nfts'));
 const routes=derived(()=>props.data.content.pages.map(p=>({href:`/${p.slug}`,label:p.title,kind:'article' as const,wide:p.layout==='archive',splash:['splash','split-splash'].includes(p.layout)})));
 return <><a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-5 focus:z-50">Skip to artwork</a><RouteEffects/><NavigationProgress/><CanvasScrollbar/><MediaDownload/>{currentPath().startsWith('/admin')?props.children:<SiteFrame navigation={props.data.content.navigation} style={themeStyle(props.data.content.theme)} motion={props.data.content.theme.motion} routes={routes.value} hasHero={!!hero.value} hero={hero.value&&<Hero section={hero.value.section} item={hero.value.item}/>} footer={<Footer/>}>{props.children}</SiteFrame>}</>;
}
