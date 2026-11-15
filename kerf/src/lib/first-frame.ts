import records from '#/content/first-frames.json';
import type {MediaAsset} from '@kerf-js/core/media';
const catalog=records as {sources:Record<string,string>;assets:Record<string,MediaAsset>};
/** A sharp, measured first frame; the original movie remains a separate save asset. */
export function firstFrame(source:string|undefined){return catalog.assets[catalog.sources[source??'']??''];}
export function firstFramePoster(source:string|undefined,fallback:string){const asset=firstFrame(source);if(!asset)return fallback;const webp=asset.sources.find(item=>item.type==='image/webp')??asset.sources.at(-1);return webp?.srcset.split(', ').find(rung=>Number.parseInt(rung.split(' ')[1]!)>=640)?.split(' ')[0]??asset.src;}
