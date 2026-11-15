// Use Kerf's first-frame provider for every local movie; no work runs in visitors' browsers.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createFirstFrameBuild} from '@kerf-js/media/build';
import {createMediaEncode} from '@kerf-js/media-ffmpeg/build';
const root=path.resolve('../public'),out=path.join(root,'media-optimized');
const inventory=JSON.parse(await fs.readFile('media/source-manifest.json','utf8'));
const records=await fs.readFile('media/first-frame-manifest.json','utf8').then(JSON.parse).catch(()=>({version:1,entries:{},errors:[]}));
const builder=createFirstFrameBuild({widths:[384,640,960,1600],target:100,scorer:'none'});
const encode={'video/h264':createMediaEncode({key:'video/h264',timeout:600000})};
const assets=await fs.readFile('src/content/first-frames.json','utf8').then(JSON.parse).catch(()=>({sources:{},assets:{}}));
const publish=asset=>({...asset,src:'/media-optimized/'+asset.src,sources:asset.sources.map(source=>({...source,srcset:source.srcset.split(', ').map(rung=>'/media-optimized/'+rung).join(', ')}))});
const atomic=async(file,value)=>{const temporary=file+".tmp-"+process.pid;await fs.writeFile(temporary,JSON.stringify(value));await fs.rename(temporary,file);};
const write=async(publish=false)=>{
 await atomic('media/first-frame-manifest.json',records);
 if(publish){const file='src/content/first-frames.json',json=JSON.stringify(assets);if(await fs.readFile(file,'utf8').catch(()=>'')!==json)await atomic(file,assets);}
};
const movies=Object.entries(inventory.entries).filter(([,entry])=>/\.(mp4|m4v|webm|mov|gif)$/i.test(entry.original.file));
const old=JSON.parse(await fs.readFile('src/content/optimized-media.json','utf8'));
const priority=new Set([...process.argv.filter(value=>value.startsWith('--priority=')).map(value=>value.slice(11)),...Object.values(old.hero??{})]);
movies.sort(([a],[b])=>(priority.has(a)?0:a.startsWith('/hero/')?1:2)-(priority.has(b)?0:b.startsWith('/hero/')?1:2));
console.log(JSON.stringify({stage:'first-frames',movies:movies.length}));
for(const [url,entry]of movies){
 try{
  const file=path.join(root,entry.original.file),built=await builder.build({file},{cacheDir:path.resolve('.kerf/media-cache'),encode});
  for(const output of built.files)await fs.writeFile(path.join(out,output.name),output.bytes);
  const asset=publish(built.asset),id=built.verification.sourceSha256;
  assets.assets[id]=asset;
  for(const source of [url,'/'+entry.original.file,entry.asset?.src,entry.save?.src])if(source)assets.sources[source]=id;
  records.entries[url]={asset,verification:built.verification,files:built.files.map(file=>({name:file.name,bytes:file.bytes.length})),complete:true};
  console.log(JSON.stringify({stage:'first-frame-ready',source:url,widths:built.verification.widths,formats:asset.sources.map(s=>s.type),bytes:built.files.reduce((sum,file)=>sum+file.bytes.length,0),done:Object.keys(assets.assets).length}));
 }catch(error){records.errors.push({source:url,message:error.message});console.log(JSON.stringify({stage:'first-frame-error',source:url,error:error.message}));}
 await write(priority.has(url));
}
for(const painting of old.paintings??[]){const id=assets.sources[painting.desktop];if(id&&!assets.sources[painting.original])assets.sources[painting.original]=id;}
for(const [original,copy] of Object.entries(old.hero??{})){const id=assets.sources[copy];if(id)assets.sources[original]=id;}
await write(true);console.log(JSON.stringify({stage:'first-frames-complete',movies:movies.length,prepared:Object.keys(records.entries).length,errors:records.errors.length}));
