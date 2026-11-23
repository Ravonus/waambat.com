import {onCleanup,onMount,state,watch} from '@kerf-js/core';
import {observeMediaViewport} from '@kerf-js/media/browser';
import {navigation} from './navigation/NavigationProvider';
export interface RefObject<T>{current:T|null|undefined;}
/** One policy for visible playback, predictive preparation, manual pause and navigation. */
export function useViewportPlayback(container:RefObject<HTMLElement>,disabled:boolean|(()=>boolean)=false,onChange?:(playing:boolean)=>void,minimumVisible=.1){
 const requested=state(false),wanted=state(false),preparing=state(false),visible=state(false),intersecting=state(false),ahead=state(false),near=state(false),manual=state(false),paused=state(false),restricted=state(false),foreground=state(true),desired={current:false};
 const nav=navigation;
 let wasVisible=false;
 const sync=()=>{const stopped=typeof disabled==='function'?disabled():disabled;
  const enabled=!stopped&&foreground.value&&nav.menu.value==='closed'&&!paused.value;
  const play=enabled&&(visible.value||ahead.value||(manual.value&&intersecting.value))&&(!restricted.value||manual.value);
  preparing.value=enabled&&near.value&&!restricted.value;
  if(play||preparing.value)requested.value=true;
  // Native players may pause an offscreen prestart. Entering the viewport must
  // retry even when prediction already made the desired state true.
  const arrived=visible.value&&!wasVisible;wasVisible=visible.value;
  const changed=desired.current!==play;desired.current=play;wanted.value=play;if(changed||(play&&arrived))onChange?.(play);return play;
 };
 onMount(()=>{const el=container.current;if(!el)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const connection=(navigator as Navigator&{connection?:EventTarget&{saveData?:boolean}}).connection;
  const preferences=()=>{restricted.value=motion.matches||!!connection?.saveData;manual.value=false;};
  const visibility=()=>{foreground.value=!document.hidden;const retry=desired.current;if(sync()&&retry)onChange?.(true);};preferences();visibility();
  const stop=observeMediaViewport(el,s=>{visible.value=s.visible;intersecting.value=s.intersecting;ahead.value=s.anticipating&&(!s.intersecting||desired.current);near.value=s.preparing;},minimumVisible);
  watch(()=>[visible.value,intersecting.value,ahead.value,near.value,manual.value,paused.value,restricted.value,foreground.value,nav.menu.value,typeof disabled==='function'?disabled():disabled],()=>{sync();});
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pageshow',visibility);motion.addEventListener('change',preferences);connection?.addEventListener('change',preferences);
  onCleanup(()=>{desired.current=false;onChange?.(false);stop();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',visibility);motion.removeEventListener('change',preferences);connection?.removeEventListener('change',preferences);});
 });
 return {requested,wanted,preparing,desired,play(){
  // A rejected autoplay leaves wanted=true. Retry synchronously in the visitor's
  // gesture even when the desired state did not change; keep all visibility gates.
  const retry=desired.current;manual.value=true;paused.value=false;
  if(sync()&&retry)onChange?.(true);
 },pause(){paused.value=true;manual.value=false;}};
}
