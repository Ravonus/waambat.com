import {onMount,watch} from '@kerf-js/core';
import {currentPath} from '@kerf-js/start';
import {warmMediaStarts} from '@kerf-js/media/browser';
import {mediaWarmTargets} from '#/lib/media-starts';
export default function MediaWarm(){
 onMount(()=>watch(()=>currentPath(),path=>{
  if(path.startsWith('/admin'))return;
  let queue:ReturnType<typeof warmMediaStarts>|undefined;
  const timer=setTimeout(()=>{queue=warmMediaStarts(mediaWarmTargets(),{startDelayMs:0});},6000);
  return ()=>{clearTimeout(timer);queue?.cancel();};
 }));
 return null;
}
