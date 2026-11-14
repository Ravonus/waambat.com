import {derived} from '@kerf-js/core';
import {Media,type MediaAsset} from '@kerf-js/core/media';
import records from '#/content/local-media.json';
import {sourceImageSet} from '#/lib/source-image';
const assets=records as Record<string,MediaAsset>;
export default function SourceImage({src,alt,eager=false,className='',sizes='(max-width: 767px) calc(100vw - 40px), 960px'}:{src:string;alt:string;eager?:boolean;className?:string;sizes?:string}){
 const asset=derived(()=>assets[src]),source=derived(()=>sourceImageSet(src));
 return <>{asset.value?<Media data-save-source={src} src={asset.value} alt={alt} decorative={!alt} priority={eager} sizes={sizes} className={className}/>:<img data-save-source={src} src={source.value.src} srcSet={source.value.srcSet} sizes={sizes} alt={alt} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':undefined} decoding="async" className={className} style={{aspectRatio:'auto'}}/>}</>;
}
