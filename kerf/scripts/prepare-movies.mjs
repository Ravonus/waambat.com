// Workers publish isolated receipts; only this coordinator merges the canonical inventory.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const file='media/source-manifest.json',receipt=JSON.parse(await fs.readFile(file,'utf8'));
const recovered=await fs.readFile('media/recovered-inscriptions.json','utf8').then(JSON.parse).catch(()=>({entries:{}}));
const archived=await fs.readFile('media/recovered-archive.json','utf8').then(JSON.parse).catch(()=>null);
if(archived?.source)recovered.entries[archived.source]={...archived,provider:'archive-recovery',provenance:{archive:archived.url,expectedHash:'../keel/hero/sources.json'}};
for(const [source,entry] of Object.entries(recovered.entries))receipt.entries[source]??=entry;
const directory=path.resolve('media/worker-results');await fs.mkdir(directory,{recursive:true});
const pending=Object.entries(receipt.entries).filter(([,entry])=>/\.(mp4|m4v|webm|mov)$/i.test(entry.original.file)&&(!entry.complete||entry.asset?.kind!=='video'));
let cursor=0,done=0;
async function worker(){
 while(cursor<pending.length){
  const [source,entry]=pending[cursor++],id=createHash('sha256').update(source).digest('hex'),result=path.join(directory,id+'.json');
  let record=await fs.readFile(result,'utf8').then(JSON.parse).catch(()=>null);
  if(record?.entry.sha256!==entry.sha256||!record?.entry.complete||record.entry.asset?.kind!=='video'){
   console.log(JSON.stringify({stage:'movie-compare',source,bytes:entry.original.bytes}));
   const log=await fs.open(path.join(directory,id+'.log'),'w');
   try{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','scripts/prepare-media.mjs','--videos','--only='+source,'--result-file='+result],{stdio:['ignore',log.fd,log.fd]});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Movie worker failed: '+source+' ('+code+')')));});}finally{await log.close();}
   record=JSON.parse(await fs.readFile(result,'utf8'));
  }
  if(record.source!==source||record.entry.sha256!==entry.sha256)throw new Error('Movie worker receipt mismatch');
  receipt.entries[source]=record.entry;
  console.log(JSON.stringify({stage:'movie-qualified',source,complete:record.entry.complete,selected:record.entry.verification?.selected,error:record.entry.optimizationError,done:++done,total:pending.length}));
 }
}
console.log(JSON.stringify({stage:'movie-batch',pending:pending.length,concurrency:3}));
await Promise.all([worker(),worker(),worker()]);
const temporary=file+'.tmp-'+process.pid;await fs.writeFile(temporary,JSON.stringify(receipt,null,2));await fs.rename(temporary,file);
console.log(JSON.stringify({stage:'movie-batch-complete',processed:done}));
