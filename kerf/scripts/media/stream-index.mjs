// Select native display quality from build metadata, without a blocking browser master fetch.
import fs from 'node:fs/promises';
import path from 'node:path';
const origin='https://media.invalid';
export function streamRenditions(text,source){
 if(!text.startsWith('#EXTM3U'))throw new Error('Invalid stream playlist: '+source);
 const lines=text.split(/\r?\n/).map(line=>line.trim());
 const levels=lines.flatMap((line,index)=>{
  if(!line.startsWith('#EXT-X-STREAM-INF:'))return [];
  const uri=lines.slice(index+1).find(value=>value&&!value.startsWith('#'));
  const size=/RESOLUTION=(\d+)x(\d+)/.exec(line);
  if(!uri||!size)throw new Error('Missing stream rendition: '+source);
  const url=new URL(uri,new URL(source,origin));
  if(url.origin!==origin||!url.pathname.startsWith('/streams/')||url.search||url.hash)throw new Error('Nonlocal stream rendition');
  return [{url:url.pathname,width:Number(size[1]),height:Number(size[2]),bitrate:Number(/BANDWIDTH=(\d+)/.exec(line)?.[1]??0)}];
 });
 return levels.length?levels:[{url:source,width:0,height:0,bitrate:0}];
}
export async function writeStreamIndex(root=process.cwd()){
 const read=async name=>JSON.parse(await fs.readFile(path.join(root,'src/content',name),'utf8'));
 const [legacy,local]=await Promise.all([read('adaptive-media.json'),read('local-streams.json')]);
 const sources=[...new Set(Object.values({...local,...legacy.streams}))].sort();
 const entries=await Promise.all(sources.map(async source=>{
  if(typeof source!=='string'||!source.startsWith('/streams/')||source.includes('..'))throw new Error('Invalid stream source');
  const levels=streamRenditions(await fs.readFile(path.join(root,'public',source),'utf8'),source);
  await Promise.all(levels.map(level=>fs.access(path.join(root,'public',level.url))));
  return [source,levels];
 }));
 const value=JSON.stringify(Object.fromEntries(entries))+'\n',target=path.join(root,'src/content/stream-renditions.json');
 if(await fs.readFile(target,'utf8').catch(()=>'')!==value){const temp=target+'.tmp';await fs.writeFile(temp,value);await fs.rename(temp,target)}
 return {streamIndexBytes:Buffer.byteLength(value),playlists:entries.length};
}
