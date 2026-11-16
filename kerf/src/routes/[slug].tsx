import {notFound,redirect,type LoadArgs,type RouteProps,type Meta} from '@kerf-js/start';
import {getPublicContent} from '#/server/public';
import {routeContent} from '#/lib/public-view';
import {publicForm} from '#/lib/forms';
import {socialImage,pageGraph,robotsMeta} from '#/lib/site-settings';
import {indexableSite} from '#/lib/seo';
import {pageDescription} from '#/lib/seo';
import Gallery from '#/components/Gallery';
import ContentPage from '#/components/ContentPage';
import LegacySplash from '#/components/LegacySplash';
import {NavigationArrival} from '#/components/navigation/NavigationProvider';
export const load=async({params,request}:LoadArgs<'/[slug]'>)=>{if(params.slug==='nfts-copy')redirect('/');const content=await getPublicContent(request),page=content.pages.find(p=>p.slug===params.slug&&!p.archived);if(!page)return notFound();return {content:routeContent(content,page.slug),page,forms:content.forms.filter(f=>f.enabled&&f.page===page.slug).map(publicForm)};};
export const meta:Meta<typeof load>=({data})=>({title:data.page.seo.title||data.page.title,description:pageDescription(data.page),og:{image:{url:socialImage(data.content,`/${data.page.slug}`,data.page.seo.title||data.page.title,pageDescription(data.page),data.page.seo.image),width:1200,height:630}},jsonLd:pageGraph(data.content,`/${data.page.slug}`,data.page.seo.title||data.page.title,pageDescription(data.page),data.page.slug==='contact-waambat'?'ContactPage':data.page.slug==='bio-waambat'?'AboutPage':data.page.layout==='archive'?'CollectionPage':'WebPage'),extra:[robotsMeta(indexableSite()&&!data.page.seo.noIndex&&!['splash','split-splash'].includes(data.page.layout))]});
export default function Page(props:RouteProps<typeof load>){return <><NavigationArrival routeKey={`/${props.data.page.slug}`}/>{['splash','split-splash'].includes(props.data.page.layout)?<LegacySplash page={props.data.page} theme={props.data.content.theme}/>:<><ContentPage page={props.data.page} forms={props.data.forms}/><Gallery content={props.data.content} page={props.data.page.slug}/></>}</>;}
export function Loading(){return <section class="waambat-skeleton"><div class="waambat-skeleton-line"/><div class="waambat-skeleton-line"/><div class="waambat-skeleton-art"/></section>;}
export const skeleton=Loading;
