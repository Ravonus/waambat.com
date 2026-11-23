import {initialMediaLevel, mediaConnection, mediaStartPlaylist, supportsMediaStreaming} from '@kerf-js/media/browser';
import {onMount, watch, state} from '@kerf-js/core';
import type Hls from 'hls.js';
import type {VideoHandle} from './OptimizedVideo';
import type {RefObject} from './useViewportPlayback';
import {localVideo} from '#/lib/local-media';
import {adaptiveStream} from '#/lib/adaptive-media';
import {adaptiveVideoConfig, preferNativeHls} from '#/lib/adaptive-video-config';
import {videoRevealTime} from '#/lib/first-frame';

/** Keep a sharp still until display-quality video is ready; pauses never reset its rendition. */
export function useAdaptiveVideo(ref:RefObject<VideoHandle>,source:()=>string|undefined,wanted:()=>boolean,preload:boolean|(()=>boolean)=false){
 const controller={current:null as Hls|null},ready={current:false},sharp=state(false);
 const shouldLoad=()=>wanted()||(typeof preload==='function'?preload():preload);
 onMount(()=>watch(source,src=>{
  const video=ref.current;
  if(!src||!video)return;
  sharp.value=false;
  if(!(video instanceof HTMLVideoElement)){sharp.value=true;return;}
  if(wanted())video.dataset.mediaPreparing='true';
  const stream=adaptiveStream(src);
  let cancelled=false,fallbackUsed=false,nativeUsed=false,resize:ResizeObserver|undefined;
  let frameRequest:number|undefined;
  const inspect=(presentedTime=video.currentTime)=>{
   const width=Number(video.dataset.mediaWidth)||0,height=Number(video.dataset.mediaHeight)||0;
   if(video.readyState>=2&&video.videoWidth>=width&&video.videoHeight>=height&&presentedTime>=videoRevealTime(src))sharp.value=true;
   else if(!video.paused&&typeof video.requestVideoFrameCallback==='function')schedule();
  };
  const schedule=()=>{
   if(cancelled||frameRequest!==undefined||sharp.value)return;
   if(typeof video.requestVideoFrameCallback==='function')frameRequest=video.requestVideoFrameCallback((_now,metadata)=>{frameRequest=undefined;inspect(metadata.mediaTime);});
   else inspect();
  };
  for(const event of ['playing','resize','loadeddata','timeupdate'])video.addEventListener(event,schedule);
  const dimensions=()=>({width:video.clientWidth||video.width,height:video.clientHeight||video.height});
  const destroy=()=>{resize?.disconnect();controller.current?.destroy();controller.current=null;ready.current=false;};
  const play=()=>{if(wanted())void video.play().catch(()=>{});};
  const fallback=()=>{if(cancelled||fallbackUsed)return;fallbackUsed=true;destroy();delete video.dataset.mediaWidth;delete video.dataset.mediaHeight;video.src=localVideo(src);video.dataset.delivery='mp4';play();};
  const nativeFallback=async()=>{
   if(cancelled)return;
   if(!nativeUsed&&stream&&video.canPlayType('application/vnd.apple.mpegurl')){
    nativeUsed=true;destroy();delete video.dataset.mediaWidth;delete video.dataset.mediaHeight;
    try{
     const box=dimensions(),playlist=await mediaStartPlaylist(stream,box.width,box.height,devicePixelRatio);
     if(cancelled)return;
     video.src=playlist;video.dataset.delivery='native-hls';play();
    }catch{fallback();}
   }else fallback();
  };
  // A failed HLS attachment can emit a native error before its fallback is ready.
  // Only a failure of the final native file belongs to the artwork's error UI.
  const onNativeError=(event:Event)=>{
   if(video.dataset.delivery==='adaptive-hls'){event.stopImmediatePropagation();void nativeFallback();}
   else if(video.dataset.delivery==='native-hls'){event.stopImmediatePropagation();fallback();}
  };
  video.addEventListener('error',onNativeError,true);
  void (async()=>{
   if(!stream){fallback();return;}
   // Keep controlled buffering with classic MSE. Managed-only iPhones use the
   // pinned native playlist, avoiding a player cold-start stall with no fatal error.
   if(preferNativeHls(video)||!supportsMediaStreaming()){void nativeFallback();return;}
   try{
    const {default:Player}=await import('hls.js/light');
    if(cancelled)return;
    if(!Player.isSupported()){void nativeFallback();return;}
    const player=new Player(adaptiveVideoConfig);controller.current=player;video.dataset.delivery='adaptive-hls';
    player.on(Player.Events.ERROR,(_event,data)=>{if(data.fatal)void nativeFallback();});
    player.on(Player.Events.FRAG_BUFFERED,()=>{if(!wanted())player.stopLoad();});
    player.on(Player.Events.MANIFEST_PARSED,()=>{
     if(cancelled)return;
     const pin=()=>{
      const box=dimensions(),level=initialMediaLevel(player.levels,box.width,box.height,mediaConnection(),devicePixelRatio);
      player.startLevel=level;if(player.loadLevel!==level){sharp.value=false;player.loadLevel=level;}
      video.dataset.mediaWidth=String(player.levels[level]?.width??0);
      video.dataset.mediaHeight=String(player.levels[level]?.height??0);
     };
     pin();ready.current=true;
     resize=new ResizeObserver(()=>{if(!cancelled)pin();});resize.observe(video);
     if(shouldLoad())player.startLoad();play();
    });
    player.attachMedia(video);player.loadSource(stream);
   }catch{void nativeFallback();}
  })();
  return()=>{cancelled=true;delete video.dataset.mediaPreparing;if(frameRequest!==undefined)video.cancelVideoFrameCallback(frameRequest);for(const event of ['playing','resize','loadeddata','timeupdate'])video.removeEventListener(event,schedule);video.removeEventListener('error',onNativeError,true);destroy();video.pause();video.removeAttribute('src');video.load();};
 }));
 onMount(()=>watch(()=>[wanted(),sharp.value],()=>{
  const video=ref.current;if(!(video instanceof HTMLVideoElement))return;
  if(wanted()&&!sharp.value)video.dataset.mediaPreparing='true';else delete video.dataset.mediaPreparing;
 }));
 onMount(()=>watch(()=>[wanted(),typeof preload==='function'?preload():preload],()=>{
  if(!ready.current)return;
  if(shouldLoad())controller.current?.startLoad(-1);else controller.current?.stopLoad();
 }));
 return {sharp};
}
