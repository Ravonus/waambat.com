import {socialImage} from '#/lib/site-settings';
import type {LoadArgs,RouteProps,Meta} from '@kerf-js/start';
import {getPublicContent} from '#/server/public';
import {routeContent} from '#/lib/public-view';
import Gallery from '#/components/Gallery';
import {NavigationArrival} from '#/components/navigation/NavigationProvider';
export const load=async({request}:LoadArgs)=>({content:routeContent(await getPublicContent(request),'ordinals')});
export const meta:Meta<typeof load>=({data})=>({og:{image:{url:socialImage(data.content,'/ordinals','Ordinals','Explore WAAMBAT’s LUX, Kismet Twist, Edge Corporeal, and early Ordinals inscriptions.'),width:1200,height:630}},title:'Ordinals',description:'Explore WAAMBAT’s LUX, Kismet Twist, Edge Corporeal, and early Ordinals inscriptions.'});
export default function Ordinals(props:RouteProps<typeof load>){return <><NavigationArrival routeKey="/ordinals"/><Gallery content={props.data.content} page="ordinals"/></>;}
export function Loading(){return <section class="waambat-skeleton"><div class="waambat-skeleton-line"/><div class="waambat-skeleton-art"/><div class="waambat-skeleton-art"/></section>;}
export const skeleton=Loading;
