import {onCleanup,onMount,state,watch,derived,untrack} from '@kerf-js/core';
import {Media,type MediaPlayback} from '@kerf-js/core/media';
import type {JSX} from '@kerf-js/core/jsx-runtime';
import {playbackAsset} from '#/lib/local-media';

export type VideoHandle=MediaPlayback & {videoWidth?:number;videoHeight?:number;error?:unknown};
type PlayerEvent={currentTarget:VideoHandle};
type Handlers={onLoadedMetadata?:(event:PlayerEvent)=>void;onLoadedData?:(event:PlayerEvent)=>void;onCanPlay?:(event:PlayerEvent)=>void;onPlay?:(event:PlayerEvent)=>void;onPlaying?:(event:PlayerEvent)=>void;onPause?:(event:PlayerEvent)=>void;onTimeUpdate?:(event:PlayerEvent)=>void;onEnded?:(event:PlayerEvent)=>void;onError?:(event:PlayerEvent)=>void};
type Props=Omit<JSX.IntrinsicElements['video'],keyof Handlers|'ref'> & Handlers & {source:string;ref?:(player:VideoHandle)=>void};
const events={onLoadedMetadata:'loadedmetadata',onLoadedData:'loadeddata',onCanPlay:'canplay',onPlay:'play',onPlaying:'playing',onPause:'pause',onTimeUpdate:'timeupdate',onEnded:'ended',onError:'error'} as const;

/** Preserve each placement and its controls; use Kerf frames only when the build selected that representation. */
export default function OptimizedVideo(props:Props){
 const asset=derived(()=>playbackAsset(props.source));
 return <>{asset.value?.frames&&!props.controls ? <FrameVideo key={props.source} {...props}/> : <NativeVideo {...props}/>}</>;
}
function NativeVideo({source,ref,...props}:Props){
 return <video {...props} width={props.width} height={props.height} poster={props.poster} ref={node=>ref?.(node)}/>;
}
function FrameVideo(props:Props){
 const asset=untrack(()=>playbackAsset(props.source)!);
 const current=state<VideoHandle|null>(null),nativeFallback=state(false);
 const removals:Array<()=>void>=[];
 const {source,ref,src,poster,onLoadedMetadata,onLoadedData,onCanPlay,onPlay,onPlaying,onPause,onTimeUpdate,onEnded,onError,...attributes}=props;
 const playback=(player:MediaPlayback)=>{
  let failed=false;
  const handle=player as VideoHandle;
  Object.defineProperties(handle,{videoWidth:{get:()=>asset.width},videoHeight:{get:()=>asset.height},error:{get:()=>failed?new Error('Frame playback failed'):undefined}});
  for(const [key,event] of Object.entries(events)){
   const notify=()=>{if(event==='error'){failed=true;handle.pause();nativeFallback.value=true;return;}props[key as keyof Handlers]?.({currentTarget:handle});};
   player.addEventListener(event,notify);removals.push(()=>player.removeEventListener(event,notify));
  }
  current.value=handle;
  ref?.(handle);
  props.onLoadedMetadata?.({currentTarget:handle});
  // The parent decides whether playback is wanted; no image work starts for a paused gallery item.
  props.onLoadedData?.({currentTarget:handle});
  props.onCanPlay?.({currentTarget:handle});
 };
 onMount(()=>watch(()=>[current.value,props.muted,props.loop],()=>{
  const player=current.value;if(!player)return;
  player.muted=!!props.muted;player.loop=!!props.loop;
 }));
 onCleanup(()=>{for(const remove of removals)remove();current.value?.pause();});
 return <>{nativeFallback.value?<NativeVideo {...props} src={asset.src}/>:<Media {...attributes} onError={()=>nativeFallback.value=true} src={asset} alt={String(props['aria-label']??asset.name)} playback={playback} controls={false} data-delivery="kerf-frames"/>}</>;
}
