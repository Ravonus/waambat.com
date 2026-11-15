import {socialImage,artistGraph} from '#/lib/site-settings';
import type {LoadArgs,RouteProps,Meta} from '@kerf-js/start';
import {getPublicContent} from '#/server/public';
import Gallery from '#/components/Gallery';
import {NavigationArrival} from '#/components/navigation/NavigationProvider';
export const load=async({request}:LoadArgs)=>({content:await getPublicContent(request)});
export const meta:Meta<typeof load>=({data})=>({title:{absolute:data.content.seo.homeTitle},description:data.content.seo.description,og:{image:{url:socialImage(data.content,'/',data.content.seo.homeTitle,data.content.seo.description),width:1200,height:630}},jsonLd:artistGraph(data.content)});
export default function Home(props:RouteProps<typeof load>){return <><NavigationArrival/><Gallery content={props.data.content} page="nfts"/></>;}
export function Loading(){return <section class="waambat-skeleton"><div class="waambat-skeleton-art"/><div class="waambat-skeleton-line"/><div class="waambat-skeleton-art"/></section>;}
export const skeleton=Loading;
