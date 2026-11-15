// Publish only files referenced by the verified application catalogs; prior encoding trials stay local.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'../..'),repo=path.resolve(app,'..'),root=path.join(repo,'public');
const names=['media/source-manifest.json','media/first-frame-manifest.json','media/stream-manifest.json','src/content/local-media.json','src/content/media-downloads.json','src/content/playback-assets.json','src/content/first-frames.json','src/content/local-streams.json'];
const sources=JSON.parse(await fs.readFile(path.join(app,names[0]),'utf8'));
const paths=new Set();
function collect(value){if(typeof value==='string'){for(const match of value.matchAll(/\/(?:media-optimized|media-originals|streams\/kerf-copy-[a-f0-9]+)\/[A-Za-z0-9._-]+/g))paths.add(match[0].slice(1));}else if(value&&typeof value==='object')for(const item of Object.values(value))collect(item);}
for(const name of names){const value=JSON.parse(await fs.readFile(path.join(app,name),'utf8'));collect(name==='media/source-manifest.json'?value.entries:value);}
for(const entry of Object.values(sources.entries))if(/^(media-optimized|media-originals|streams\/kerf-copy-)/.test(entry.original.file))paths.add(entry.original.file);
const stream=JSON.parse(await fs.readFile(path.join(app,'media/stream-manifest.json'),'utf8'));
for(const entry of Object.values(stream.entries))for(const file of entry.files)paths.add(entry.directory.slice(1)+'/'+file.name);
const tracked=new Set(execFileSync('git',['ls-files','-z'],{cwd:repo}).toString().split('\0'));
const files=[];
for(const name of [...paths].sort()){
 if(tracked.has('public/'+name))continue;
 const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw new Error('Invalid media path');
 const stat=await fs.stat(file);if(!stat.isFile())throw new Error('Media must be regular files');
 const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
 files.push({path:name,bytes:stat.size,sha256:hash.digest('hex')});
}
const digest=createHash('sha256').update(JSON.stringify(files)).digest('hex');
const manifest={version:1,repository:'Ravonus/waambat.com',tag:'waambat-media-'+digest.slice(0,16),sha256:digest,files,packs:[]};
const file=path.join(app,'media/storage-manifest.json');await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:files.reduce((total,file)=>total+file.bytes,0),tag:manifest.tag}));
