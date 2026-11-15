import {onMount,watch} from '@kerf-js/core';
import {warmMediaStarts} from '@kerf-js/media/browser';
import {mediaWarmTargets} from '#/lib/media-starts';
export default function MediaWarm({routeKey}:{routeKey:string}){
 onMount(()=>watch(()=>routeKey,path=>{
  if(path.startsWith('/admin'))return;
  let queue:ReturnType<typeof warmMediaStarts>|undefined;
  const timer=setTimeout(()=>{queue=warmMediaStarts(mediaWarmTargets(),{startDelayMs:0});},0);
  return ()=>{clearTimeout(timer);queue?.cancel();};
 }));
 return null;
}
