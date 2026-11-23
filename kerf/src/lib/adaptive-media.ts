import media from "~/content/adaptive-media.json";
import local from "~/content/local-streams.json";
import renditions from "~/content/stream-renditions.json";
import {initialMediaLevel} from '@kerf-js/media/browser';
const streams: Record<string, string> = media.streams;
const posters: Record<string, string> = media.posters;
export const adaptiveStream = (source: string) => streams[source]??(local as Record<string,string>)[source];
/** Prepared streams select their pinned native URL synchronously, without a network gate. */
export function adaptiveRendition(source:string,width:number,height:number,pixelRatio=1){
 const url=adaptiveStream(source);
 const levels=(renditions as Record<string,Array<{url:string;width:number;height:number;bitrate:number}>>)[url??''];
 return levels?.[initialMediaLevel(levels,width,height,{},pixelRatio)];
}
export const adaptivePoster = (source: string) => posters[source] ?? source;

const responsivePosters = new Set(
  Object.values(posters).filter((src) => src.endsWith("-960.webp")),
);
export const isAdaptivePoster = (source: string) =>
  responsivePosters.has(source);

export const adaptivePreview = (source: string) =>
  (media as { previews?: Record<string, { poster: string; ratio: number }> })
    .previews?.[source];
