import {videoSource,type VideoSource} from './video-source';
import {localVideo} from './local-media';
/** Delivery can change without changing the approved source or its original destination. */
export function playbackSource(value:string):VideoSource|null{const source=videoSource(value);if(!source)return null;const local=localVideo(value);return local!==value?{...source,provider:'direct',player:local,direct:true}:source;}
