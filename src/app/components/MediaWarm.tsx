"use client";
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {warmMediaStarts} from '@kerf-js/media/browser';
import {mediaWarmTargets} from '~/lib/media-starts';
export default function MediaWarm(){
 const path=usePathname();
 useEffect(()=>{
  if(path.startsWith('/admin'))return;
  let queue:ReturnType<typeof warmMediaStarts>|undefined;
  const timer=setTimeout(()=>{queue=warmMediaStarts(mediaWarmTargets(),{startDelayMs:0});},6000);
  return ()=>{clearTimeout(timer);queue?.cancel();};
 },[path]);
 return null;
}
