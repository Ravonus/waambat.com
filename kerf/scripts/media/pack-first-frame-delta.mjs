// Add newly verified first frames without repacking or copying the original media bundles.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'../..'),root=path.resolve(app,'../public');
const directory=path.resolve(process.argv[2]??'../../../outputs/sharp-starts-20261115/media-release');
const file=path.join(app,'media/storage-manifest.json'),manifest=JSON.parse(await fs.readFile(file,'utf8'));
const frames=JSON.parse(await fs.readFile(path.join(app,'media/first-frame-manifest.json'),'utf8'));
const known=new Set(manifest.files.map(item=>item.path)),files=[];
for(const entry of Object.values(frames.entries)){
 if(!entry.complete||entry.verification?.pixels!=='exact')throw new Error('First frame lacks exact-pixel verification');
 for(const output of entry.files){
  if(!/^[A-Za-z0-9._-]+$/.test(output.name))throw new Error('Invalid first-frame file');
  const name='media-optimized/'+output.name;if(known.has(name))continue;known.add(name);
  const bytes=await fs.readFile(path.join(root,name));
  if(bytes.length!==output.bytes)throw new Error('First-frame size changed: '+name);
  files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
}
if(!files.length)throw new Error('No new first frames to publish');
files.sort((a,b)=>a.path.localeCompare(b.path));
await fs.mkdir(directory,{recursive:true});
const list=path.join(directory,'members.txt'),archive=path.join(directory,'first-frames.tar');
await fs.writeFile(list,files.map(item=>item.path).join('\n')+'\n');
execFileSync('tar',['-cf',archive,'-C',root,'--no-recursion','-T',list],{env:{...process.env,COPYFILE_DISABLE:'1'}});
await fs.unlink(list);
const data=await fs.readFile(archive),sha256=createHash('sha256').update(data).digest('hex');
const name=`media-${manifest.packs.length+1}-${sha256.slice(0,20)}.tar`;
await fs.rename(archive,path.join(directory,name));
for(const pack of manifest.packs)pack.releaseTag??=manifest.tag;
for(const item of files)item.pack=name;
manifest.files.push(...files);manifest.files.sort((a,b)=>a.path.localeCompare(b.path));
manifest.sha256=createHash('sha256').update(JSON.stringify(manifest.files.map(({pack,...item})=>item))).digest('hex');
manifest.tag='waambat-media-'+manifest.sha256.slice(0,16);
manifest.packs.push({name,bytes:data.length,sha256});
await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');
await fs.copyFile(file,path.join(directory,'storage-manifest.json'));
console.log(JSON.stringify({tag:manifest.tag,files:files.length,pack:manifest.packs.at(-1),directory}));
