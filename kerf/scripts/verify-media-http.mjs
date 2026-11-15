// HEAD checks exercise the built server's file routing without downloading hundreds of original movies.
import fs from 'node:fs/promises';
const base=process.argv[2]??'http://localhost:3288';
const host=new URL(base);if(!['localhost','127.0.0.1'].includes(host.hostname))throw new Error('Use the local preview server');
const sources=JSON.parse(await fs.readFile('media/source-manifest.json','utf8')).entries;
const frames=JSON.parse(await fs.readFile('media/first-frame-manifest.json','utf8')).entries;
const checks=new Map(Object.values(sources).map(entry=>['/'+entry.original.file,entry.original.bytes]));
const downloads=JSON.parse(await fs.readFile('src/content/media-downloads.json','utf8')).files;
for(const [source,entry] of Object.entries(sources))if(downloads[source]?.originalSrc)checks.set(downloads[source].originalSrc,entry.original.bytes);
for(const entry of Object.values(frames))for(const file of entry.files)checks.set('/media-optimized/'+file.name,file.bytes);
const entries=[...checks],errors=[];let cursor=0;
async function worker(){while(cursor<entries.length){const [path,bytes]=entries[cursor++];try{const response=await fetch(new URL(path,base),{method:'HEAD',signal:AbortSignal.timeout(15000)});if(!response.ok||Number(response.headers.get('content-length'))!==bytes)errors.push({path,status:response.status,expected:bytes,length:response.headers.get('content-length')});}catch(error){errors.push({path,message:error.message});}}}
await Promise.all(Array.from({length:6},worker));
const proof={base,checked:checks.size,errors};await fs.writeFile('media/http-verification.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));if(errors.length)process.exitCode=1;
