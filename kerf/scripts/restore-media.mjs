import fs from 'node:fs/promises';
import path from 'node:path';
import {restoreMedia,mediaReleaseUrl} from './media/restore.mjs';
const app=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await fs.readFile(path.join(app,'media/storage-manifest.json'),'utf8'));
if(manifest.repository!=='Ravonus/waambat.com'||!/^waambat-media-[a-f0-9]{16}$/.test(manifest.tag))throw new Error('Unexpected media release');
const result=await restoreMedia({
 root:path.resolve(app,'../public'),staging:path.join(app,'.kerf/media-restore'),manifest,
 fetchPack:async pack=>{
  console.log('Restoring verified media bundle '+pack.name);
  return fetch(mediaReleaseUrl(manifest,pack),{signal:AbortSignal.timeout(1800000)});
 },
});
console.log(JSON.stringify({media:'verified',...result}));
