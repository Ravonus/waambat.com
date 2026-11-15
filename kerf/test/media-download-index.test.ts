import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreDownloadIndex} from '../scripts/media/download-index.mjs';

test('a one-asset rebuild preserves original Save links for older movies without asset records',()=>{
 const entries={
  'https://i.imgur.com/older.mp4':{original:{file:'media-originals/older.mp4',bytes:12345},save:{src:'/media-optimized/older-save.mp4',name:'old.mp4',type:'video/mp4',bytes:12000}},
  'https://i.imgur.com/new.mp4':{original:{file:'media-originals/new.mp4',bytes:4321},save:{src:'/media-originals/new.mp4',name:'new.mp4',type:'video/mp4',bytes:4321},asset:{src:'/media-optimized/new.avif',original:{src:'/media-originals/new.mp4',type:'video/mp4'},sources:[{srcset:'/media-optimized/new.avif 960w'}]}}
 };
 const files=restoreDownloadIndex(entries);
 assert.equal(files['https://i.imgur.com/older.mp4'].originalSrc,'/media-originals/older.mp4');
 assert.equal(files['/media-optimized/older-save.mp4'].originalBytes,12345);
 assert.equal(files['/media-optimized/older-save.mp4'].name,'older.mp4');
 assert.equal(files['/media-optimized/new.avif'].originalSrc,'/media-originals/new.mp4');
 assert.equal(files['/media-optimized/new.avif'].type,'video/mp4');
});

import {resolveMediaDownload} from '../src/lib/media-download';
test('absolute preview URLs resolve to retained originals and movie posters save the whole movie',()=>{
 const movie={src:'/original.mp4',name:'original.mp4',type:'video/mp4',bytes:123};
 const still={src:'/poster.png',name:'poster.png',type:'image/png',bytes:20};
 const catalog={files:{'/preview.webp':still,'https://example.com/movie.mp4':movie},artworks:{}};
 assert.equal(resolveMediaDownload(catalog,{kind:'IMG',sources:['http://localhost:3287/preview.webp'],baseURL:'http://localhost:3287/contact-waambat'}),still);
 assert.equal(resolveMediaDownload(catalog,{kind:'IMG',sources:['/preview.webp'],owner:'https://example.com/movie.mp4',baseURL:'http://localhost:3287/'}),movie);
});
test('an unindexed local image remains saveable and a blob player is never offered as its original',()=>{
 const catalog={files:{},artworks:{}};
 assert.equal(resolveMediaDownload(catalog,{kind:'IMG',sources:['/logo.svg'],baseURL:'http://localhost:3287/'} )?.type,'image/svg+xml');
 assert.equal(resolveMediaDownload(catalog,{kind:'VIDEO',sources:['blob:http://localhost:3287/id'],baseURL:'http://localhost:3287/'}),undefined);
});
