// Bounded, resumable acquisition and encoding. Downloads and encoding run here, never in a visitor's browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
import {createMediaEncode} from '@kerf-js/media-ffmpeg/build';
import {createMediaBuild} from '@kerf-js/media/build';
import {restoreDownloadIndex} from './media/download-index.mjs';
import {getPublishedContent} from '../src/server/content.ts';
const exec=promisify(execFile),root=path.resolve('../public');
const originals=path.join(root,'media-originals'),outputs=path.join(root,'media-optimized');
const stamp=bytes=>createHash('sha256').update(bytes).digest('hex');
const content=await getPublishedContent();
const discovered=new Set(),artworks={},providers=new Set(),youtube=new Set();
const direct=/\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|mov|m4v)(?:[?#].*)?$/i;
function walk(value){if(typeof value==='string'&&(/^(https:\/\/|\/(?!\/))/.test(value))){if(direct.test(value))discovered.add(value);else if(/^https:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?\d+/.test(value))providers.add(value);else if(/^https:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]{11}/.test(value))youtube.add(value);}else if(value&&typeof value==='object')for(const item of Object.values(value))walk(item);}
walk(content);
for(const section of content.sections)for(const item of section.items)if(!item.archived)artworks[item.id]=item.videoSrc||item.poster;
console.log(JSON.stringify({direct:discovered.size,vimeo:providers.size,youtube:youtube.size,limitGiB:8,concurrency:1}));
if(process.argv.includes('--inventory'))process.exit(0);
await fs.mkdir(originals,{recursive:true});await fs.mkdir(outputs,{recursive:true});
const receiptFile='media/source-manifest.json',imagesOnly=process.argv.includes('--images'),videosOnly=process.argv.includes('--videos'),only=process.argv.find(value=>value.startsWith('--only='))?.slice(7),indexOnly=process.argv.includes('--index-only');
const framework=JSON.parse(await fs.readFile('vendor/framework-media.json','utf8'));
const videoPolicy='kerf-native-frames-target90-v1';
const resultFile=process.argv.find(value=>value.startsWith('--result-file='))?.slice(14);
if(resultFile&&(!videosOnly||!only))throw new Error('A worker result requires one explicit movie source');
const receipt=await fs.readFile(receiptFile,'utf8').then(JSON.parse).catch(()=>({version:1,entries:{},unavailable:[]}));
if(!imagesOnly&&!videosOnly&&!indexOnly)receipt.unavailable=[];
const recovered=await fs.readFile('media/recovered-inscriptions.json','utf8').then(JSON.parse).catch(()=>({entries:{}}));
const archived=await fs.readFile('media/recovered-archive.json','utf8').then(JSON.parse).catch(()=>null);
if(archived?.source)recovered.entries[archived.source]={...archived,provider:'archive-recovery',provenance:{archive:archived.url,expectedHash:'../keel/hero/sources.json'}};
for(const [url,entry] of Object.entries(recovered.entries)){if(!receipt.entries[url])receipt.entries[url]=entry;discovered.add(url);}
const downloads={files:restoreDownloadIndex(receipt.entries),artworks},images=JSON.parse(await fs.readFile('src/content/local-media.json','utf8'));
const encode=Object.fromEntries(['video/h264','video/av1'].map(key=>[key,createMediaEncode({key,timeout:600000})]));
const builder=createMediaBuild({formats:['avif','webp'],quality:{lossless:true,target:90},video:{delivery:'auto',lossless:false,codecs:['av1']},encoder:'compatible',swap:'manual'});
let added=0;
const cap=8*1024**3;
async function acquire(url,cacheKey=url){
 if(url.startsWith('/')){const file=path.resolve(root,'.'+new URL(url,'https://waamb.at').pathname);if(!file.startsWith(root+path.sep))throw new Error('Invalid asset path');return file;}
 const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||/^(localhost|127\.|10\.|192\.168\.)/.test(parsed.hostname))throw new Error('Not a public HTTPS asset');
 const key=stamp(cacheKey),record=receipt.entries[cacheKey];
 if(record?.original?.file&&await fs.stat(path.join(root,record.original.file)).catch(()=>false))return path.join(root,record.original.file);
 const response=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
 const declared=Number(response.headers.get('content-length')??0);if(declared>512*1024**2)throw new Error('File exceeds the 512 MiB download limit');
 const ext=path.extname(parsed.pathname).toLowerCase()||'.mp4',file=path.join(originals,key+ext),handle=await fs.open(file+'.part','w');
 let size=0;try{for await(const chunk of response.body){size+=chunk.length;added+=chunk.length;if(size>512*1024**2||added>cap)throw new Error('Media acquisition storage budget reached');await handle.write(chunk);}}finally{await handle.close();}
 await fs.rename(file+'.part',file);return file;
}
function published(name){return '/media-optimized/'+name;}
async function atomic(file,value,pretty=false){const temporary=file+'.tmp-'+process.pid;await fs.writeFile(temporary,JSON.stringify(value,null,pretty?2:undefined));await fs.rename(temporary,file);}
function mapAsset(asset,retained){
 const url=name=>retained&&name===asset.original?.src?retained:published(name);
 return {...asset,src:url(asset.src),...(asset.poster&&{poster:published(asset.poster)}),...(asset.original&&{original:{...asset.original,src:url(asset.original.src)}}),...(asset.copy&&{copy:{...asset.copy,src:url(asset.copy.src)}}),sources:asset.sources.map(s=>({...s,srcset:s.srcset.split(', ').map(r=>{const [name,width]=r.split(' ');return url(name)+(width?' '+width:'');}).join(', ')})),...(asset.frames&&{frames:{...asset.frames,chunks:asset.frames.chunks.map(chunk=>({...chunk,src:published(chunk.src)})),...(asset.frames.audio&&{audio:{...asset.frames.audio,src:published(asset.frames.audio.src)}})}})};
}
async function processAsset(url,file){
 const bytes=await fs.readFile(file),sha256=stamp(bytes),source='/'+path.relative(root,file),ext=path.extname(file).toLowerCase();
 const previous=receipt.entries[url],isVideo=/\.(mp4|webm|mov|m4v)$/.test(ext),isAnimation=ext==='.gif',policy=isAnimation?'kerf-visible-animation-v1':videoPolicy;
 if(previous?.sha256===sha256&&previous.complete&&previous.provider==='@kerf-js/media'&&(!(isVideo||isAnimation)||(previous.optimizationPolicy===policy||['kerf-auto-native-frames-v1:db7fbbe18251e07f9845de5aad768346738ec2bd','kerf-auto-native-frames-v1:6c76dfb7','kerf-auto-native-frames-v1:368fb402'].some(policy=>previous.optimizationPolicy?.startsWith(policy))))){
  if(previous.asset){images[url]=previous.asset;images[source]=previous.asset;}
  if(previous.save){downloads.files[url]=previous.save;downloads.files[source]=previous.save;if(previous.asset){downloads.files[previous.asset.src]=previous.save;for(const s of previous.asset.sources)for(const r of s.srcset.split(', '))downloads.files[r.split(' ')[0]]=previous.save;}}
  if(resultFile)await atomic(resultFile,{source:url,entry:previous});
  return;
 }
 let asset,save={src:source,name:path.basename(file),type:'application/octet-stream',bytes:bytes.length,original:url};
 const verification={originalSha256:sha256};
 if(isVideo){
  const info=await encode['video/h264'].info(file),budget=Math.min(bytes.length,Math.max(512*1024,Math.ceil(bytes.length/Math.max(info.duration,0.25)/Math.max(info.video?.fps??30,1)*8)));
  const movieBuilder=createMediaBuild({formats:['avif','webp'],quality:{lossless:true,target:90},video:{delivery:'auto',lossless:false,codecs:['av1'],maxFrameBytes:budget},encoder:'compatible',swap:'manual'});
  const built=await movieBuilder.build({file,bytes:new Uint8Array(bytes)},{cacheDir:path.resolve('.kerf/media-cache'),root:path.resolve('.'),encode});
  if(!built.asset)throw new Error(built.diagnostics?.map(d=>d.message).join('; ')||'Video refused');
  for(const output of built.files)if(output.name!==built.asset.original?.src)await fs.writeFile(path.join(outputs,output.name),output.bytes);
  asset=mapAsset(built.asset,source);images[url]=asset;images[source]=asset;
  save={...save,src:source,type:asset.original.type};
  Object.assign(verification,built.verification,{diagnostics:built.diagnostics});
 }else if(/\.(png|jpe?g|webp|avif)$/.test(ext)){
  const built=await builder.build({file,bytes:new Uint8Array(bytes)},{cacheDir:path.resolve('.kerf/media-cache'),root:path.resolve('.')});
  for(const output of built.files)await fs.writeFile(path.join(outputs,output.name),output.bytes);
  asset=mapAsset(built.asset);images[url]=asset;images[source]=asset;
  save={...save,name:`waambat-${sha256.slice(0,12)}${ext}`,type:built.asset.type};verification.pixels='exact at every encoded width';
 }else if(ext==='.gif'){
  const built=await builder.build({file,bytes:new Uint8Array(bytes)},{cacheDir:path.resolve('.kerf/media-cache'),root:path.resolve('.')});
  if(!built.asset)throw new Error('Animation preparation failed');
  for(const output of built.files)await fs.writeFile(path.join(outputs,output.name),output.bytes);
  asset=mapAsset(built.asset);images[url]=asset;images[source]=asset;save.type='image/gif';Object.assign(verification,built.verification);
 }else if(ext==='.svg'){
  const built=await builder.build({file,bytes:new Uint8Array(bytes)},{cacheDir:path.resolve('.kerf/media-cache'),root:path.resolve('.')});
  if(!built.asset)throw new Error(built.diagnostics?.map(d=>d.message).join('; ')||'SVG refused');
  for(const output of built.files)await fs.writeFile(path.join(outputs,output.name),output.bytes);asset=mapAsset(built.asset);images[url]=asset;save.type='image/svg+xml';
 }
 downloads.files[url]=save;downloads.files[source]=save;
 if(asset){downloads.files[asset.src]=save;for(const s of asset.sources)for(const r of s.srcset.split(', '))downloads.files[r.split(' ')[0]]=save;}
 receipt.entries[url]={...(previous?.provenance&&{provenance:previous.provenance}),provider:'@kerf-js/media',implementationRevision:framework.sourceRevision,...((isVideo||isAnimation)&&{optimizationPolicy:policy}),sha256,original:{file:path.relative(root,file),bytes:bytes.length},save,asset,verification,complete:true};
 if(resultFile){await atomic(resultFile,{source:url,entry:receipt.entries[url]});return;}
 await atomic(receiptFile,receipt,true);
 console.log(JSON.stringify({asset:new URL(url,'https://waamb.at').pathname,kind:isVideo?'video':'image',bytes:bytes.length,verification}));
}
if(videosOnly&&!indexOnly)for(const [url,entry] of Object.entries(receipt.entries)){if(only&&url!==only)continue;if(!/\.(mp4|webm|mov|m4v)$/i.test(entry.original?.file??''))continue;console.log(JSON.stringify({stage:'encoding',source:url,bytes:entry.original.bytes}));try{await processAsset(url,path.join(root,entry.original.file));}catch(error){entry.optimizationError={policy:videoPolicy,message:error.message};if(resultFile)await atomic(resultFile,{source:url,entry});else await atomic(receiptFile,receipt,true);console.log(JSON.stringify({source:url,stage:'retained',error:error.message}));}}
if(resultFile)process.exit(0);
for(const url of (videosOnly||indexOnly)?[]:discovered){if(only&&url!==only)continue;if(imagesOnly&&!recovered.entries[url]&&!/\.(png|jpe?g|webp|avif|gif|svg)(?:[?#].*)?$/i.test(url))continue;try{await processAsset(url,await acquire(url));}catch(error){receipt.unavailable.push({source:url,error:error.message});console.log(JSON.stringify({unavailable:new URL(url,'https://waamb.at').pathname,error:error.message}));}}
// Only public progressive provider files are cached; inaccessible or interactive works keep their original player.
for(const url of (imagesOnly||videosOnly||indexOnly)?[]:providers){
 try{const id=new URL(url).pathname.match(/\d+/)?.[0];const r=await fetch(`https://player.vimeo.com/video/${id}/config`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`Provider HTTP ${r.status}`);const config=await r.json();const progressive=config.request?.files?.progressive?.sort((a,b)=>(b.width??0)-(a.width??0))[0];if(!progressive?.url)throw new Error('No public downloadable progressive file');const local=await acquire(progressive.url,url);await processAsset(url,local);}catch(error){receipt.unavailable.push({source:url,error:error.message});console.log(JSON.stringify({provider:new URL(url).pathname,error:error.message}));}
}
for(const url of (imagesOnly||videosOnly||indexOnly)?[]:youtube){
 try{
  const previous=receipt.entries[url];
  if(previous?.complete){await processAsset(url,path.join(root,previous.original.file));continue;}
  const id=new URL(url).pathname.split('/').at(-1),prefix=path.join(originals,`youtube-${id}`);
  console.log(JSON.stringify({youtube:id,stage:'download'}));
  await exec(path.resolve('.kerf/media-tools/bin/python'),['-m','yt_dlp','--no-playlist','--no-warnings','--no-progress','--no-cache-dir','--socket-timeout','20','--retries','1','--fragment-retries','1','--max-filesize','512M','-f','bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/best[vcodec^=avc1][ext=mp4]/best[ext=mp4]','--merge-output-format','mp4','-o',prefix+'.%(ext)s',`https://www.youtube.com/watch?v=${id}`],{timeout:240000,maxBuffer:1048576});
  await processAsset(url,prefix+'.mp4');
 }catch(error){const reason=String(error.stderr||error.message).slice(-600);receipt.unavailable.push({source:url,error:reason});console.log(JSON.stringify({youtube:new URL(url).pathname,error:reason}));}
}
Object.assign(downloads.files,restoreDownloadIndex(receipt.entries));
// A save filename and its HTTP type follow the actual container, not the remote URL's extension.
for(const [url,entry] of Object.entries(receipt.entries)){
 if(!entry.asset)continue;
 const asset=entry.asset,file=path.join(root,entry.original.file);
 const extension={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/avif':'.avif','image/gif':'.gif','image/svg+xml':'.svg'}[asset.type];
 if(entry.provider==='@kerf-js/media'&&asset.original){entry.save={...entry.save,src:asset.original.src,type:asset.original.type,bytes:asset.original.bytes};}
 else if(extension){
  const name=`${entry.sha256.slice(0,24)}-original${extension}`,target=path.join(outputs,name);
  await fs.copyFile(file,target);
  const old=asset.src;
  if(asset.kind!=='vector'){asset.src=published(name);asset.sources=asset.sources.map(s=>({...s,srcset:s.srcset.replaceAll(old,asset.src)}));}
  entry.save={...entry.save,src:published(name),name:`waambat-${entry.sha256.slice(0,12)}${extension}`,type:asset.type};
 }
 if(asset.kind==='photo'&&entry.provider!=='@kerf-js/media'){
  const tiny=await sharp(file).rotate().resize({width:24}).webp({lossless:true,effort:4}).toBuffer();
  asset.placeholder='data:image/webp;base64,'+tiny.toString('base64');
 }
 images[url]=asset;
 images['/'+entry.original.file]=asset;
 downloads.files[url]=entry.save;
 downloads.files['/'+entry.original.file]=entry.save;
 downloads.files[asset.src]=entry.save;
 for(const s of asset.sources)for(const r of s.srcset.split(', '))downloads.files[r.split(' ')[0]]=entry.save;
}
for(const [url,entry] of Object.entries(receipt.entries)){
 if(!entry.complete||!entry.save)continue;
 const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/avif':'.avif','image/gif':'.gif','image/svg+xml':'.svg','video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov'}[entry.save.type]??path.extname(entry.original.file);
 const originalName=decodeURIComponent(new URL(url,'https://waamb.at').pathname.split('/').at(-1)||'waambat').replace(/\.[^.]*$/,'')+ext;
 const extra={originalSrc:entry.save.type.startsWith('image/')?entry.save.src:'/'+entry.original.file,originalName,originalBytes:entry.original.bytes};
 for(const value of Object.values(downloads.files))if(value.original===url)Object.assign(value,extra);
}
const playback={},playbackAssets={sources:{},assets:{}};
for(const [url,entry] of Object.entries(receipt.entries)){
 if(entry.asset?.kind==='video'){
  const asset=entry.asset,id=entry.sha256;playbackAssets.assets[id]=asset;
  for(const name of [url,'/'+entry.original.file,asset.src,...asset.sources.flatMap(s=>s.srcset.split(', ').map(r=>r.split(' ')[0]))]){
   playback[name]=asset.src;playbackAssets.sources[name]=id;
  }
 }else if(entry.verification?.video==='identical encoded samples'){
  playback[url]=entry.save.src;playback['/'+entry.original.file]=entry.save.src;
 }
}
receipt.unavailable=receipt.unavailable.filter(item=>!receipt.entries[item.source]?.complete);
await atomic('src/content/playback-media.json',playback);
await atomic('src/content/playback-assets.json',playbackAssets);
await atomic('src/content/local-media.json',images);
await atomic('src/content/media-downloads.json',downloads);
await atomic(receiptFile,receipt,true);
console.log(JSON.stringify({complete:Object.keys(receipt.entries).length,unavailable:receipt.unavailable.length,downloadedMiB:Math.round(added/1048576)}));
