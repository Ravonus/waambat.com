// Recover public image artifacts through their inscription bodies when the content gateway is unavailable.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {inscriptionBodies} from './media/inscription-body.mjs';
const root=path.resolve('../public'),site=JSON.parse(await fs.readFile('src/content/site.json','utf8'));
const urls=new Set();
function walk(value){if(value&&typeof value==='object'){if(typeof value.poster==='string'&&/^https:\/\/ordinals\.com\/content\/[a-f0-9]{64}i\d+$/.test(value.poster))urls.add(value.poster);for(const item of Object.values(value))walk(item);}}
walk(site);
const provenance=JSON.parse(await fs.readFile('../keel/hero/sources.json','utf8')).sources;
const receipt={version:1,reference:'https://docs.ordinals.com/inscriptions.html',entries:{},errors:[]};
for(const source of urls){
 try{
  const id=source.split('/').at(-1),[txid,index]=id.split('i'),endpoint='https://mempool.space/api/tx/'+txid;
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Transaction HTTP '+response.status);
  const transaction=await response.json();if(transaction.txid!==txid)throw new Error('Transaction identifier mismatch');
  const body=inscriptionBodies(transaction)[Number(index)];if(!body?.type?.startsWith('image/'))throw new Error('The inscription is not a standalone image');
  const ext={'image/gif':'.gif','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/avif':'.avif'}[body.type];if(!ext)throw new Error('Unsupported image type '+body.type);
  const sha256=createHash('sha256').update(body.bytes).digest('hex'),expected=provenance.find(entry=>entry.origin===source)?.sha256;
  if(expected&&sha256!==expected)throw new Error('Original source hash mismatch');
  await sharp(body.bytes,{animated:true}).metadata();
  const file='media-originals/'+createHash('sha256').update(source).digest('hex')+ext;
  await fs.writeFile(path.join(root,file),body.bytes);
  receipt.entries[source]={provider:'inscription-recovery',sha256,type:body.type,original:{file,bytes:body.bytes.length},provenance:{transaction:txid,index:Number(index),endpoint,existingHashMatched:expected?true:undefined},complete:false};
  console.log(JSON.stringify({source,type:body.type,bytes:body.bytes.length,sha256,existingHashMatched:expected?true:undefined}));
 }catch(error){receipt.errors.push({source,message:error.message});console.log(JSON.stringify({source,error:error.message}));}
}
await fs.writeFile('media/recovered-inscriptions.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify({stage:'recovery-complete',recovered:Object.keys(receipt.entries).length,errors:receipt.errors.length}));
