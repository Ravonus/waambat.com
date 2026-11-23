import test from 'node:test';
import assert from 'node:assert/strict';
import {preferNativeHls} from '../src/lib/adaptive-video-config';
import {createRoot,flush,state} from '@kerf-js/core';
import {useAdaptiveVideo,videoRef} from '../src/components/useAdaptiveVideo';
import type {VideoHandle} from '../src/components/OptimizedVideo';

const native = {canPlayType: () => 'maybe' as CanPlayTypeResult};
const unsupported = {canPlayType: () => '' as CanPlayTypeResult};
class StreamingSource {}

test('native HLS stays first on Apple browsers with either or both streaming APIs', () => {
  assert.equal(preferNativeHls(native, {ManagedMediaSource: StreamingSource}), true);
  assert.equal(preferNativeHls(native, {MediaSource: StreamingSource, ManagedMediaSource: StreamingSource}), true);
  assert.equal(preferNativeHls(native, {}), true);
});

test('classic MSE retains bounded controlled playback; managed streaming remains available without native HLS', () => {
  assert.equal(preferNativeHls(native, {MediaSource: StreamingSource}), false);
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
