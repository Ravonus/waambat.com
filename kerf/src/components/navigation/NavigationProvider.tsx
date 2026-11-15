import {defineState,state,onMount,watch} from '@kerf-js/core';
import styles from './navigation.module.css';
export const navigation=defineState('waambat.navigation',()=>{
 const menu=state<'closed'|'open'|'closing'>('closed'),origin=state(''),pendingHref=state(''),label=state('');
 return {menu,origin,pendingHref,label,open(path:string){origin.value=path;menu.value='open';},close(){if(menu.value==='open')menu.value='closing';},finish(){menu.value='closed';},begin(href:string,name:string){pendingHref.value=href;label.value=name;},arrived(){pendingHref.value='';}};
});
export function NavigationArrival({routeKey}:{routeKey?:string}){const nav=navigation;onMount(()=>watch(()=>routeKey??location.pathname,key=>{if(nav.menu.value==='open'&&key!==nav.origin.value)nav.close();}));return <span hidden aria-hidden="true"/>;}
export function NavigationProgress(){const nav=navigation;return <>{nav.pendingHref.value&&<div className={styles.progress} role="status" aria-live="polite"><span className="sr-only">Opening {nav.label.value}</span><i aria-hidden="true"/></div>}</>;}
export default function NavigationProvider({children}:{children:unknown}){return <>{children}</>;}
