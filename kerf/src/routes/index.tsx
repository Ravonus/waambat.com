import type {LoadArgs,RouteProps} from '@kerf-js/start';
import {getPublicContent} from '#/server/public';
import Gallery from '#/components/Gallery';
import {NavigationArrival} from '#/components/navigation/NavigationProvider';
export const load=async({request}:LoadArgs)=>({content:await getPublicContent(request)});
export const meta={title:'Video paintings & Ordinals',description:'Video paintings, cryptoart and Ordinals by WAAMBAT, artist Lindsay Scoggins.'};
export default function Home(props:RouteProps<typeof load>){return <><NavigationArrival/><Gallery content={props.data.content} page="nfts"/></>;}
export function Loading(){return <section class="waambat-skeleton"><div class="waambat-skeleton-art"/><div class="waambat-skeleton-line"/><div class="waambat-skeleton-art"/></section>;}
export const skeleton=Loading;
