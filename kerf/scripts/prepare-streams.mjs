// The shared encoder segments qualified native movies; visitors fetch only the current playback buffer.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createMediaEncode} from '@kerf-js/media-ffmpeg/build';
const root=path.resolve('../public'),output=path.join(root,'streams');
const staging=path.resolve('.kerf/stream-staging/active');
const inventory=JSON.parse(await fs.readFile('media/source-manifest.json','utf8'));
const legacy=JSON.parse(await fs.readFile('src/content/adaptive-media.json','utf8')).streams;
const receipt=await fs.readFile('media/stream-manifest.json','utf8').then(JSON.parse).catch(()=>({version:1,entries:{},errors:[]}));
const streams={};
const encoder=createMediaEncode({key:'video/h264',timeout:600000});
const atomic=async(file,value)=>{const temporary=file+'.tmp-'+process.pid;await fs.writeFile(temporary,JSON.stringify(value));await fs.rename(temporary,file);};
receipt.errors=[];
await fs.mkdir(output,{recursive:true});
for(const [source,entry] of Object.entries(inventory.entries)){
 if(!/\.(mp4|mov|m4v)$/i.test(entry.original.file)||entry.asset?.frames)continue;
 const aliases=[source,'/'+entry.original.file,entry.asset?.src,entry.save?.src].filter(Boolean);
 if(aliases.some(alias=>legacy[alias]))continue;
 const selected=entry.asset?.src??'/'+entry.original.file;
 if(!selected.startsWith('/'))continue;
 const file=path.resolve(root,'.'+selected);
 if(!file.startsWith(root+path.sep))throw new Error('Stream source must be local');
 const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
 const sha256=hash.digest('hex'),id='kerf-copy-'+sha256.slice(0,24),directory=path.join(output,id);
 try{
  let record=receipt.entries[source];
  if(record?.sha256!==sha256||!await fs.stat(path.join(directory,'index.m3u8')).catch(()=>false)){
   console.log(JSON.stringify({stage:'stream-copy',source,bytes:entry.original.bytes}));
   await fs.rm(staging,{recursive:true,force:true});
   const built=await encoder.native.stream(file,{directory:staging,seconds:2});
   await fs.rename(staging,directory);
   record={sha256,directory:'/streams/'+id,files:built.files,verification:built.verification};
   receipt.entries[source]=record;
  }
  for(const alias of aliases)streams[alias]=record.directory+'/index.m3u8';
  console.log(JSON.stringify({stage:'stream-ready',source,...record.verification}));
 }catch(error){
  receipt.errors.push({source,message:error.message});
  await fs.rm(staging,{recursive:true,force:true});
  console.log(JSON.stringify({stage:'stream-progressive-fallback',source,error:error.message}));
 }
 await atomic('media/stream-manifest.json',receipt);
}
await atomic('src/content/local-streams.json',streams);
console.log(JSON.stringify({stage:'streams-complete',movies:Object.keys(receipt.entries).length,aliases:Object.keys(streams).length,errors:receipt.errors.length}));
