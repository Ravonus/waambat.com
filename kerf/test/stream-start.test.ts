import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {streamRenditions} from '../scripts/media/stream-index.mjs';
import {adaptiveRendition} from '../src/lib/adaptive-media';
import {HERO_MOBILE_LOOP} from '../src/lib/hero';
import index from '../src/content/stream-renditions.json';

test('native starts use prepared display-quality playlists without a browser master lookup',()=>{
 const selected=adaptiveRendition(HERO_MOBILE_LOOP,390,487.5,3)!;
 assert.equal(selected.width,720);assert.equal(selected.height,900);
 assert.match(selected.url,/\/720\.m3u8$/);
 assert.match(readFileSync('public'+selected.url,'utf8'),/#EXT-X-MAP/);
 assert.equal(adaptiveRendition('/artist-upload.mp4',390,487,3),undefined);
 for(const levels of Object.values(index))for(const level of levels){
  assert.ok(level.url.startsWith('/streams/'));
  assert.ok(readFileSync('public'+level.url,'utf8').startsWith('#EXTM3U'));
 }
});
test('the build index refuses broken or external rendition targets',()=>{
 assert.throws(()=>streamRenditions('not a playlist','/streams/a/master.m3u8'));
 assert.throws(()=>streamRenditions('#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=720x900\nhttps://other.test/video.m3u8','/streams/a/master.m3u8'));
 assert.throws(()=>streamRenditions('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\n720.m3u8','/streams/a/master.m3u8'));
});
