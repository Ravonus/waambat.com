import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {restoreMedia} from '../scripts/media/restore.mjs';
const hash=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
async function fixture(run:(context:any)=>Promise<void>){
 const directory=await fs.mkdtemp(path.join(tmpdir(),'waambat-restore-'));
 try{
  const input=path.join(directory,'input'),root=path.join(directory,'public'),staging=path.join(directory,'staging'),source=Buffer.from('exact original bytes');
  await fs.mkdir(path.join(input,'media-optimized'),{recursive:true});await fs.writeFile(path.join(input,'media-optimized','sample.webp'),source);
  const archive=path.join(directory,'bundle.tar');execFileSync('tar',['-cf',archive,'-C',input,'media-optimized/sample.webp'],{env:{...process.env,COPYFILE_DISABLE:'1'}});
  const bytes=await fs.readFile(archive),name='media-1-'+hash(bytes).slice(0,20)+'.tar';
  const manifest={files:[{path:'media-optimized/sample.webp',bytes:source.length,sha256:hash(source),pack:name}],packs:[{name,bytes:bytes.length,sha256:hash(bytes)}]};
  await run({root,staging,manifest,source,fetchPack:async()=>new Response(bytes)});
 }finally{await fs.rm(directory,{recursive:true,force:true});}
}
test('a fresh checkout restores exact bytes and a verified existing checkout avoids another download',()=>fixture(async context=>{
 assert.deepEqual(await restoreMedia(context),{files:1,restoredPacks:1});
 assert.deepEqual(await fs.readFile(path.join(context.root,context.manifest.files[0].path)),context.source);
 assert.deepEqual(await restoreMedia({...context,fetchPack:()=>{throw new Error('must not fetch');}}),{files:1,restoredPacks:0});
}));
test('a corrupt release bundle is refused before any file is extracted',()=>fixture(async context=>{
 context.manifest.packs[0].sha256='0'.repeat(64);await assert.rejects(restoreMedia(context),/checksum/);
 await assert.rejects(fs.stat(path.join(context.root,context.manifest.files[0].path)),/ENOENT/);
}));
test('changed local artwork is retained instead of being overwritten',()=>fixture(async context=>{
 await restoreMedia(context);const file=path.join(context.root,context.manifest.files[0].path);await fs.writeFile(file,'artist change');
 await assert.rejects(restoreMedia(context),/refusing to overwrite/);assert.equal(await fs.readFile(file,'utf8'),'artist change');
}));
test('archive members must match the declared media paths',()=>fixture(async context=>{
 context.manifest.files[0].path='media-optimized/other.webp';await assert.rejects(restoreMedia(context),/unexpected paths/);
}));
test('paths outside public media are rejected before network access',()=>fixture(async context=>{
 context.manifest.files[0].path='../outside.webp';await assert.rejects(restoreMedia({...context,fetchPack:()=>{throw new Error('must not fetch');}}),/Invalid media path/);
}));
