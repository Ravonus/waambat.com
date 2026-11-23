// Keep custom legacy streams on Kerf's shared bounded playback policy.
import {mediaHlsConfig} from '@kerf-js/media/browser';
// Managed-only native playback is selected before loading hls.js. The controlled
// path must not silently switch back to ManagedMediaSource when both APIs exist.
export const adaptiveVideoConfig={...mediaHlsConfig,preferManagedMediaSource:false};

type StreamingBrowser = {MediaSource?: unknown; ManagedMediaSource?: unknown};
/** Managed-only iPhones use native HLS; classic MSE retains controlled buffering. */
export function preferNativeHls(video: Pick<HTMLMediaElement, 'canPlayType'>, browser: StreamingBrowser = globalThis) {
  return typeof browser.MediaSource !== 'function' && !!video.canPlayType('application/vnd.apple.mpegurl');
}
