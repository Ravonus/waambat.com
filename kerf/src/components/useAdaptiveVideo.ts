import {initialMediaLevel, mediaConnection, mediaStartPlaylist} from '@kerf-js/media/browser';
import {onMount, watch, state} from '@kerf-js/core';
import type Hls from 'hls.js';
import type {VideoHandle} from './OptimizedVideo';
import type {RefObject} from './useViewportPlayback';
import {localVideo} from '#/lib/local-media';
import {adaptiveStream} from '#/lib/adaptive-media';
import {adaptiveVideoConfig} from '#/lib/adaptive-video-config';

/** Keep a sharp still until display-quality video is ready; pauses never reset its rendition. */
export function useAdaptiveVideo(ref:RefObject<VideoHandle>,source:()=>string|undefined,wanted:()=>boolean,preload:boolean|(()=>boolean)=false){
 const controller={current:null as Hls|null},ready={current:false},sharp=state(false);
 const shouldLoad=()=>wanted()||(typeof preload==='function'?preload():preload);
 onMount(()=>watch(source,src=>{
  const video=ref.current;
  if(!src||!video)return;
  sharp.value=false;
  if(!(video instanceof HTMLVideoElement)){sharp.value=true;return;}
  const stream=adaptiveStream(src);
  let cancelled=false,fallbackUsed=false,nativeUsed=false,resize:ResizeObserver|undefined;
  let frameRequest:number|undefined;
  const inspect=()=>{
   const width=Number(video.dataset.mediaWidth)||0,height=Number(video.dataset.mediaHeight)||0;
   if(video.readyState>=2&&video.videoWidth>=width&&video.videoHeight>=height)sharp.value=true;
   else if(!video.paused&&typeof video.requestVideoFrameCallback==='function')schedule();
  };
  const schedule=()=>{
   if(cancelled||frameRequest!==undefined)return;
   if(typeof video.requestVideoFrameCallback==='function')frameRequest=video.requestVideoFrameCallback(()=>{frameRequest=undefined;inspect();});
   else inspect();
  };
  for(const event of ['playing','resize','loadeddata'])video.addEventListener(event,schedule);
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
  const onNativeError=()=>{if(video.dataset.delivery==='native-hls')fallback();};
  video.addEventListener('error',onNativeError);
  void (async()=>{
   if(!stream){fallback();return;}
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
  return()=>{cancelled=true;if(frameRequest!==undefined)video.cancelVideoFrameCallback(frameRequest);for(const event of ['playing','resize','loadeddata'])video.removeEventListener(event,schedule);video.removeEventListener('error',onNativeError);destroy();video.pause();video.removeAttribute('src');video.load();};
 }));
 onMount(()=>watch(()=>[wanted(),typeof preload==='function'?preload():preload],()=>{
  if(!ready.current)return;
  if(shouldLoad())controller.current?.startLoad(-1);else controller.current?.stopLoad();
 }));
 return {sharp};
}
