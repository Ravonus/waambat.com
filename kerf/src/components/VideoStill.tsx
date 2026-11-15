import {derived,onMount,watch} from '@kerf-js/core';
import {firstFramePreview} from '#/lib/first-frame';
import {paintingPoster} from '#/lib/painting-source';
import images from '#/content/image-media.json';
import type {MediaAsset} from '@kerf-js/core/media';
const imageAssets=images as Record<string,MediaAsset>;
type Props={source:string;playbackSource?:string;fallback:string;mobileSource?:string;mobileFallback?:string;media?:string;alt:string;className?:string;priority?:boolean;sizes?:string;onReady?:(source:string,poster?:string)=>void};
/** The movie starts behind a sharp first-frame picture, never a blown-up blur thumbnail. */
export default function VideoStill(props:Props){
 let image:HTMLImageElement|undefined;
 const desktop=derived(()=>firstFramePreview(props.source)),mobile=derived(()=>firstFramePreview(props.mobileSource));
 const fallback=derived(()=>paintingPoster(props.fallback));
 const fallbackAsset=derived(()=>imageAssets[props.fallback]);
 const mobileFallback=derived(()=>imageAssets[props.mobileFallback??props.fallback]);
 const notify=()=>{const selected=props.mobileSource&&props.media&&matchMedia(props.media).matches?props.mobileSource:props.source;props.onReady?.(props.playbackSource??selected,image?.naturalWidth?image.currentSrc:undefined);};
 const still=derived(()=>desktop.value?.src||fallbackAsset.value?.src||props.fallback||'');
 // Ready means the still settled, either way: a load or error that finished before
 // hydration attached onLoad/onError must still release the movie. With no still
 // at all there is nothing to wait for.
 onMount(()=>watch(()=>[props.source,props.mobileSource,props.playbackSource,desktop.value?.src,mobile.value?.src,still.value],()=>{if(!still.value||image?.complete)notify();}));
 return <picture class="block h-full w-full">
  {props.mobileSource&&props.media&&((mobile.value??mobileFallback.value)?.sources.length?(mobile.value??mobileFallback.value)!.sources.map(item=><source key={item.type} type={item.type} srcSet={item.srcset} media={props.media} sizes={props.sizes??'100vw'}/>):<source srcSet={mobileFallback.value?.src??props.mobileFallback??props.fallback} media={props.media}/>)}
  {(desktop.value??fallbackAsset.value)?.sources.length?(desktop.value??fallbackAsset.value)!.sources.slice(0,-1).map(item=><source key={item.type} type={item.type} srcSet={item.srcset} sizes={props.sizes??'(max-width: 767px) calc(100vw - 40px), 960px'}/>):fallback.value.avif&&<source type="image/avif" srcSet={fallback.value.avif} sizes={props.sizes??'(max-width: 767px) calc(100vw - 40px), 960px'}/>}
  {still.value&&<img ref={node=>image=node} data-save-source={props.source} data-video-first-frame src={still.value} srcSet={(desktop.value??fallbackAsset.value)?.sources.at(-1)?.srcset??fallback.value.srcSet} sizes={props.sizes??'(max-width: 767px) calc(100vw - 40px), 960px'} width={desktop.value?.width??fallbackAsset.value?.width??960} height={desktop.value?.height??fallbackAsset.value?.height??960} alt={props.alt} className={props.className??'h-full w-full object-contain'} loading={props.priority?'eager':'lazy'} fetchPriority={props.priority?'high':'low'} decoding="async" onLoad={notify} onError={notify}/>}
 </picture>;
}
