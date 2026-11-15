// Verify the concrete files and complete Save/first-frame coverage, independently of the encoder's decisions.
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('../public');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const receipt=await read('media/source-manifest.json'),download=await read('src/content/media-downloads.json');
const frames=await read('media/first-frame-manifest.json'),frameIndex=await read('src/content/first-frames.json');
const legacy=(await read('src/content/adaptive-media.json')).streams,streams=await read('src/content/local-streams.json');
const streamReceipt=await read('media/stream-manifest.json');
const errors=[],selections={},totals={originals:0,movies:0,animations:0,staticImages:0,originalBytes:0,playbackBytes:0};
async function localFile(url,bytes){
 if(!url?.startsWith('/')){errors.push('Not a retained local file: '+url);return;}
 const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep))throw new Error('Path escapes public root');
 const stat=await fs.stat(file).catch(()=>null);if(!stat||bytes!==undefined&&stat.size!==bytes)errors.push('Missing or incorrect file: '+url);
 return file;
}
for(const [source,entry] of Object.entries(receipt.entries)){
 const original='/'+entry.original.file,file=await localFile(original,entry.original.bytes);
 totals.originals++;totals.originalBytes+=entry.original.bytes;
 if(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);if(hash.digest('hex')!==entry.sha256)errors.push('Original hash changed: '+source);}
 if(!entry.complete||!entry.asset)errors.push('Unprocessed source: '+source);
 const save=download.files[source];if(!save||save.originalBytes!==entry.original.bytes)errors.push('Incorrect original Save binding: '+source);
 else if(save.originalSrc!==original){const saved=await localFile(save.originalSrc,entry.original.bytes);if(saved){const hash=createHash('sha256');for await(const chunk of createReadStream(saved))hash.update(chunk);if(hash.digest('hex')!==entry.sha256)errors.push('Original Save bytes changed: '+source);}}
 const movie=/\.(mp4|mov|m4v|webm)$/i.test(original),animation=/\.gif$/i.test(original);
 if(movie||animation){
  if(movie)totals.movies++;else totals.animations++;
  if(!frameIndex.sources[source]||!frames.entries[source]?.complete)errors.push('Missing sharp first frame: '+source);
  if(movie){const chosen=entry.verification?.selected??'unqualified';selections[chosen]=(selections[chosen]??0)+1;totals.playbackBytes+=entry.verification?.playbackBytes??entry.original.bytes;
   const aliases=[source,original,entry.asset?.src,save?.src];if(!entry.asset?.frames&&!aliases.some(alias=>legacy[alias]||streams[alias]))errors.push('Missing native stream: '+source);
  }
 }else totals.staticImages++;
}
for(const entry of Object.values(frames.entries))for(const file of entry.files)await localFile('/media-optimized/'+file.name,file.bytes);
for(const entry of Object.values(streamReceipt.entries))for(const file of entry.files)await localFile(entry.directory+'/'+file.name,file.bytes);
const result={...totals,selections,firstFrames:Object.keys(frames.entries).length,firstFrameErrors:frames.errors,streamedNewMovies:Object.keys(streamReceipt.entries).length,streamErrors:streamReceipt.errors,blockedUpstream:receipt.unavailable,errors};
await fs.writeFile('media/verification.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,blockedUpstream:result.blockedUpstream.length}));
if(errors.length||frames.errors.length||streamReceipt.errors.length)process.exitCode=1;
