// Restore immutable public media from verified release bundles without overwriting changed local artwork.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
/** Delta releases retain immutable bundles from their original release. */
export function mediaReleaseUrl(manifest,pack){
 const tag=pack.releaseTag??manifest.tag;
 if(manifest.repository!=='Ravonus/waambat.com'||!/^waambat-media-[a-f0-9]{16}$/.test(tag)||!/^media-\d+-[a-f0-9]+\.tar$/.test(pack.name))throw new Error('Unexpected media release');
 return `https://github.com/${manifest.repository}/releases/download/${tag}/${pack.name}`;
}
async function digest(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
function location(root,name){
 if(!/^(media-originals|media-optimized|streams\/kerf-copy-[a-f0-9]+)\/[A-Za-z0-9._/-]+$/.test(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Invalid media path');
 const file=path.resolve(root,name);if(!file.startsWith(path.resolve(root)+path.sep))throw new Error('Media path escapes public root');return file;
}
async function inspect(root,item){
 const file=location(root,item.path);let current=file;
 while(current!==path.resolve(root)){
  const info=await fs.lstat(current).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(info?.isSymbolicLink())throw new Error('Refusing a symbolic media path: '+item.path);
  current=path.dirname(current);
 }
 const info=await fs.stat(file).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(!info)return false;
 if(!info.isFile()||info.size!==item.bytes||await digest(file)!==item.sha256)throw new Error('Local media changed; refusing to overwrite '+item.path);
 return true;
}
async function download(file,pack,response){
 if(!response.ok||!response.body)throw new Error('Media bundle download failed: HTTP '+response.status);
 const handle=await fs.open(file,'wx'),hash=createHash('sha256');let size=0;
 try{for await(const chunk of response.body){size+=chunk.length;if(size>pack.bytes)throw new Error('Media bundle exceeds declared size');hash.update(chunk);let offset=0;while(offset<chunk.length){const written=await handle.write(chunk,offset);if(!written.bytesWritten)throw new Error('Media write made no progress');offset+=written.bytesWritten;}}}finally{await handle.close();}
 if(size!==pack.bytes||hash.digest('hex')!==pack.sha256)throw new Error('Media bundle checksum mismatch');
}
/** Existing files are checked; missing files are recovered only after archive and per-file checksum verification. */
export async function restoreMedia({root,staging,manifest,fetchPack}){
 const needed=new Set();
 for(const item of manifest.files){if(!Number.isSafeInteger(item.bytes)||item.bytes<0||!/^[a-f0-9]{64}$/.test(item.sha256))throw new Error('Invalid media record');if(!await inspect(root,item))needed.add(item.pack);}
 if(!needed.size)return {files:manifest.files.length,restoredPacks:0};
 await fs.mkdir(staging,{recursive:true});const temporary=await fs.mkdtemp(path.join(staging,'restore-'));
 try{
  for(const pack of manifest.packs){
   if(!needed.has(pack.name))continue;
   if(!/^media-\d+-[a-f0-9]+\.tar$/.test(pack.name)||!Number.isSafeInteger(pack.bytes)||pack.bytes<=0)throw new Error('Invalid media bundle');
   const archive=path.join(temporary,pack.name);await download(archive,pack,await fetchPack(pack));
   const expected=new Set(manifest.files.filter(file=>file.pack===pack.name).map(file=>file.path));
   const members=execFileSync('tar',['-tf',archive],{encoding:'utf8',maxBuffer:8*1024**2}).trim().split('\n');
   if(members.length!==expected.size||members.some(name=>!expected.has(name)))throw new Error('Media archive contains unexpected paths');
   await fs.mkdir(root,{recursive:true});
   execFileSync('tar',['-xf',archive,'-C',root,'--no-same-owner'],{env:{...process.env,COPYFILE_DISABLE:'1'}});
   for(const item of manifest.files.filter(file=>file.pack===pack.name))if(!await inspect(root,item))throw new Error('Media bundle did not restore '+item.path);
   await fs.unlink(archive);
  }
  for(const item of manifest.files)if(!await inspect(root,item))throw new Error('Missing restored media: '+item.path);
  return {files:manifest.files.length,restoredPacks:needed.size};
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
}
