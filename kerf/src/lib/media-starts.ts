import {adaptiveStream} from "./adaptive-media";
/** Only public first chunks from artwork actually present on this page are eligible. */
export function mediaWarmTargets(){
 return [...document.querySelectorAll<HTMLElement>('[data-media-start], [data-save-url]')].flatMap(node=>{
  const source=node.dataset.mediaStart??node.dataset.saveUrl, url=source?adaptiveStream(source):undefined;
  if(!url)return [];
  const frame=node.querySelector('video, picture')??node, box=frame.getBoundingClientRect();
  return [{url,width:box.width||Math.min(innerWidth,960),height:box.height||box.width*9/16||540}];
 });
}
