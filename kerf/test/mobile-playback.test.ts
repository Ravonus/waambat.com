import test from 'node:test';
import assert from 'node:assert/strict';
import {preferNativeHls,adaptiveVideoConfig} from '../src/lib/adaptive-video-config';
import {createRoot,flush,state} from '@kerf-js/core';
import {useAdaptiveVideo,videoRef} from '../src/components/useAdaptiveVideo';
import type {VideoHandle} from '../src/components/OptimizedVideo';

const native = {canPlayType: () => 'maybe' as CanPlayTypeResult};
const unsupported = {canPlayType: () => '' as CanPlayTypeResult};
class StreamingSource {}

test('native HLS stays first on managed-only iPhones and native-only browsers', () => {
  assert.equal(preferNativeHls(native, {ManagedMediaSource: StreamingSource}), true);
  assert.equal(preferNativeHls(native, {}), true);
});

test('classic MSE retains bounded controlled playback; managed streaming remains available without native HLS', () => {
  assert.equal(adaptiveVideoConfig.preferManagedMediaSource,false,'The controlled path must not silently reselect the managed transport');
  assert.equal(preferNativeHls(native, {MediaSource: StreamingSource}), false);
  assert.equal(preferNativeHls(native, {MediaSource: StreamingSource, ManagedMediaSource: StreamingSource}), false);
  assert.equal(preferNativeHls(unsupported, {ManagedMediaSource: StreamingSource}), false);
});

test('a ready source attaches when its conditional player arrives, and reattaches to a replacement',()=>{
  class NativeVideo extends EventTarget {
    dataset:Record<string,string>={};src='';paused=true;readyState=0;currentTime=0;autoplay=false;
    width=640;height=640;clientWidth=640;clientHeight=640;
    pause(){this.paused=true;}
    play(){this.paused=false;return Promise.resolve();}
    load(){}
    removeAttribute(name:string){if(name==='src')this.src='';}
  }
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'HTMLVideoElement');
  Object.defineProperty(globalThis,'HTMLVideoElement',{configurable:true,value:NativeVideo});
  const ref=videoRef(),source=state('/__qa/first.mp4'),wanted=state(true);
  let dispose=()=>{};
  try{
    createRoot(cleanup=>{dispose=cleanup;useAdaptiveVideo(ref,()=>source.value,()=>wanted.value);});
    flush();
    const first=new NativeVideo();ref.current=first as unknown as VideoHandle;flush();
    assert.equal(first.src,'/__qa/first.mp4','A source becoming ready before the element must not leave an empty player');
    assert.equal(first.autoplay,true,'Native autoplay must be set before source attachment');
    wanted.value=false;flush();assert.equal(first.autoplay,false,'Native autoplay must obey the viewport/manual policy');
    wanted.value=true;flush();assert.equal(first.autoplay,true);
    source.value='/__qa/second.mp4';flush();
    assert.equal(first.src,'/__qa/second.mp4');
    const replacement=new NativeVideo();ref.current=replacement as unknown as VideoHandle;flush();
    assert.equal(first.src,'','The replaced player must release its source');
    assert.equal(replacement.src,'/__qa/second.mp4','The replacement must attach even though its source URL did not change');
    dispose();flush();assert.equal(replacement.src,'');
  }finally{
    dispose();flush();
    if(descriptor)Object.defineProperty(globalThis,'HTMLVideoElement',descriptor);
    else Reflect.deleteProperty(globalThis,'HTMLVideoElement');
  }
});

test('a decoded clear frame reveals playback when compositor callbacks are deferred',()=>{
 class NativeVideo extends EventTarget{
  dataset:Record<string,string>={mediaWidth:'960',mediaHeight:'960'};
  src='';paused=false;readyState=2;currentTime=.2;autoplay=false;
  width=960;height=960;clientWidth=350;clientHeight=350;videoWidth=640;videoHeight=640;
  pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}load(){}
  removeAttribute(name:string){if(name==='src')this.src='';}
  requestVideoFrameCallback(){return 1;}cancelVideoFrameCallback(){}
 }
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'HTMLVideoElement');
 Object.defineProperty(globalThis,'HTMLVideoElement',{configurable:true,value:NativeVideo});
 const ref=videoRef();let dispose=()=>{},quality:ReturnType<typeof useAdaptiveVideo>|undefined;
 try{
  createRoot(cleanup=>{dispose=cleanup;quality=useAdaptiveVideo(ref,()=>'/__qa/clear.mp4',()=>true)});flush();
  const video=new NativeVideo();ref.current=video as unknown as VideoHandle;flush();
  // Native file fallback has no HLS dimensions; impose the chosen display rung.
  video.dataset.mediaWidth='960';video.dataset.mediaHeight='960';
  video.dispatchEvent(new Event('loadeddata'));flush();
  assert.equal(quality!.sharp.value,false,'An undersized decode must keep the sharp still');
  video.videoWidth=video.videoHeight=960;
  video.currentTime=0;video.dispatchEvent(new Event('loadeddata'));flush();
  assert.equal(quality!.sharp.value,false,'Keep the still during the initial native layer handoff');
  video.currentTime=.2;
  video.dispatchEvent(new Event('timeupdate'));flush();
  assert.equal(quality!.sharp.value,true,'A deferred compositor callback must not hold the still over clear moving video');
 }finally{dispose();flush();if(descriptor)Object.defineProperty(globalThis,'HTMLVideoElement',descriptor);else Reflect.deleteProperty(globalThis,'HTMLVideoElement')}
});
