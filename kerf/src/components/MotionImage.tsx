import {derived,onMount,state} from '@kerf-js/core';
import type {MediaAsset} from '@kerf-js/core/media';
import {firstFramePreview} from '#/lib/first-frame';
import {useViewportPlayback} from './useViewportPlayback';
type Props={src:string;asset:MediaAsset;alt:string;eager:boolean;className:string;sizes:string};
/** Native animated-image delivery starts after its sharp still and stops when it leaves view. */
export default function MotionImage(props:Props){
 const image={current:null as HTMLImageElement|null|undefined},readyFor=state('');
 const lifecycle=useViewportPlayback(image),preview=derived(()=>firstFramePreview(props.src));
 const active=derived(()=>lifecycle.wanted.value&&readyFor.value===props.src);
 const shown=derived(()=>active.value?props.asset:preview.value??props.asset);
 const loaded=()=>{
  const element=image.current,frame=preview.value;if(!element||!frame)return;
  const urls=[frame.src,...frame.sources.flatMap(source=>source.srcset.split(', ').map(rung=>rung.split(' ')[0]!))];
  if(urls.some(url=>new URL(url,location.href).href===element.currentSrc))readyFor.value=props.src;
 };
 onMount(()=>{if(image.current?.complete&&image.current.naturalWidth)loaded();});
 return <picture style="display:contents">
  {shown.value.sources.slice(0,-1).map(source=><source key={source.type} type={source.type} srcSet={source.srcset} sizes={props.sizes}/>)}
  <img ref={node=>image.current=node} data-save-source={props.src} data-motion-image={active.value?'playing':'still'} src={shown.value.src} srcSet={shown.value.sources.at(-1)?.srcset} width={props.asset.width} height={props.asset.height} alt={props.alt} className={props.className} sizes={props.sizes} loading={props.eager?'eager':'lazy'} fetchPriority={props.eager?'high':undefined} decoding="async" onLoad={loaded}/>
 </picture>;
}
