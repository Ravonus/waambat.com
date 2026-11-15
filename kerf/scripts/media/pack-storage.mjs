// Content-addressed release bundles avoid ordinary Git's large binary limits and retain exact saved originals.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'../..'),root=path.resolve(app,'../public');
const directory=path.resolve(app,'../../../outputs/waambat-media-release');await fs.mkdir(directory,{recursive:true});
const file=path.join(app,'media/storage-manifest.json'),manifest=JSON.parse(await fs.readFile(file,'utf8'));
const maximum=1400*1024**2,groups=[];let group=[],size=0;
for(const item of manifest.files){if(group.length&&size+item.bytes>maximum){groups.push(group);group=[];size=0;}group.push(item);size+=item.bytes;}
if(group.length)groups.push(group);manifest.packs=[];
for(let index=0;index<groups.length;index++){
 const files=groups[index],name=`media-${String(index+1).padStart(2,'0')}.tar`,archive=path.join(directory,name),list=path.join(directory,'members.txt');
 await fs.writeFile(list,files.map(file=>file.path).join('\n')+'\n');
 execFileSync('tar',['-cf',archive,'-C',root,'--no-recursion','-T',list],{env:{...process.env,COPYFILE_DISABLE:'1'}});
 const hash=createHash('sha256');for await(const chunk of createReadStream(archive))hash.update(chunk);
 const sha256=hash.digest('hex'),final=`media-${index+1}-${sha256.slice(0,20)}.tar`;await fs.rename(archive,path.join(directory,final));
 for(const item of files)item.pack=final;
 manifest.packs.push({name:final,bytes:(await fs.stat(path.join(directory,final))).size,sha256});
 console.log(JSON.stringify({pack:final,files:files.length,bytes:manifest.packs.at(-1).bytes}));
}
await fs.rm(path.join(directory,'members.txt'));await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');
await fs.copyFile(file,path.join(directory,'storage-manifest.json'));
