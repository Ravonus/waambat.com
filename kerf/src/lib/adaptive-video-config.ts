// Keep custom legacy streams on Kerf's shared bounded playback policy.
export { mediaHlsConfig as adaptiveVideoConfig } from '@kerf-js/media/browser';

type StreamingBrowser = {MediaSource?: unknown; ManagedMediaSource?: unknown};
/** Apple browsers can expose both streaming APIs; their native HLS avoids a decoder bootstrap. */
export function preferNativeHls(video: Pick<HTMLMediaElement, 'canPlayType'>, browser: StreamingBrowser = globalThis) {
  return !!video.canPlayType('application/vnd.apple.mpegurl') &&
    (typeof browser.MediaSource !== 'function' || typeof browser.ManagedMediaSource === 'function');
}
