import playback from '#/content/playback-media.json';
import records from '#/content/playback-assets.json';
import type {MediaAsset} from '@kerf-js/core/media';
const videos=playback as Record<string,string>;
const catalog=records as {sources:Record<string,string>;assets:Record<string,MediaAsset>};
/** Playback metadata contains no save-only catalog and no eager original preparation. */
export function playbackAsset(source:string){return catalog.assets[catalog.sources[source]??''];}
/** Choose a qualified native codec supported by this browser; the exact source remains the fallback. */
export function localVideo(source:string){
 const asset=playbackAsset(source);
 if(asset){
  if(!asset.frames&&typeof document!=='undefined'){
   const video=document.createElement('video');
   for(const choice of asset.sources)if(video.canPlayType(choice.type))return choice.srcset.split(', ').at(-1)!.split(' ')[0]!;
  }
  return asset.src;
 }
 return videos[source]??source;
}
