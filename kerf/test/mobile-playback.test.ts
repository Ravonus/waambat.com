import test from 'node:test';
import assert from 'node:assert/strict';
import {preferNativeHls} from '../src/lib/adaptive-video-config';

const native = {canPlayType: () => 'maybe' as CanPlayTypeResult};
const unsupported = {canPlayType: () => '' as CanPlayTypeResult};
class StreamingSource {}

test('native HLS stays first on managed-only iPhones and older native-only browsers', () => {
  assert.equal(preferNativeHls(native, {ManagedMediaSource: StreamingSource}), true);
  assert.equal(preferNativeHls(native, {}), true);
});

test('classic MSE retains bounded controlled playback; managed streaming remains available without native HLS', () => {
  assert.equal(preferNativeHls(native, {MediaSource: StreamingSource, ManagedMediaSource: StreamingSource}), false);
  assert.equal(preferNativeHls(unsupported, {ManagedMediaSource: StreamingSource}), false);
});
