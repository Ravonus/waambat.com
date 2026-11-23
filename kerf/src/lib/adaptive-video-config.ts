// Keep custom legacy streams on Kerf's shared bounded playback policy.
export { mediaHlsConfig as adaptiveVideoConfig } from '@kerf-js/media/browser';

type StreamingBrowser = {MediaSource?: unknown; ManagedMediaSource?: unknown};
/** iPhones' managed-only stream can stall on a cold start; use their pinned native HLS path. */
export function preferNativeHls(video: Pick<HTMLMediaElement, 'canPlayType'>, browser: StreamingBrowser = globalThis) {
  return typeof browser.MediaSource !== 'function' && !!video.canPlayType('application/vnd.apple.mpegurl');
}
