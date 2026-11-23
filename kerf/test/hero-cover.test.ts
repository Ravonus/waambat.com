import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the embedded hero covers are the small verified WebP frames, not blurred thumbnails',()=>{
 const covers=[
  ['hero-mobile.webp','first-71ca69d9e796b02a22d5-720-ed5622ed9b6696cf4060.webp'],
  ['hero-desktop.webp','first-c23d905e6921efbfb26b-1280-08ba1786fba18e9dd5f1.webp'],
 ];
 for(const [copy,source] of covers){
  const bytes=readFileSync('src/assets/covers/'+copy);
  assert.deepEqual(bytes,readFileSync('public/display-previews/'+source));
  assert.ok(bytes.length<12*1024,'The complete sharp cover must stay small enough to inline');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
});
