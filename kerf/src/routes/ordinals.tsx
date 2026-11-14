import socialImages from '#/content/social-images.json';
import type {LoadArgs,RouteProps} from '@kerf-js/start';
import {getPublicContent} from '#/server/public';
import Gallery from '#/components/Gallery';
import {NavigationArrival} from '#/components/navigation/NavigationProvider';
export const load=async({request}:LoadArgs)=>({content:await getPublicContent(request)});
export const meta={og:{image:{url:socialImages.ordinals,width:1200,height:630}},title:'Ordinals',description:'Explore WAAMBAT’s LUX, Kismet Twist, Edge Corporeal, and early Ordinals inscriptions.'};
export default function Ordinals(props:RouteProps<typeof load>){return <><NavigationArrival/><Gallery content={props.data.content} page="ordinals"/></>;}
export function Loading(){return <section class="waambat-skeleton"><div class="waambat-skeleton-line"/><div class="waambat-skeleton-art"/><div class="waambat-skeleton-art"/></section>;}
export const skeleton=Loading;
