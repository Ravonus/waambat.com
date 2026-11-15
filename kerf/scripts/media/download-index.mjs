// A partial encoding run must retain every previously acquired source and its original-file aliases.
const MIME={'.mp4':'video/mp4','.m4v':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.svg':'image/svg+xml'};
export function restoreDownloadIndex(entries){
 const files={};
 for(const [url,entry] of Object.entries(entries)){
  if(!entry.original?.file||!entry.save)continue;
  const source='/'+entry.original.file.replace(/^\/+/,''),asset=entry.asset,
   originalSrc=asset?.original?.src??source,
   ext=source.slice(source.lastIndexOf('.')).toLowerCase(),
   originalName=entry.save.originalName??decodeURIComponent(new URL(url,'https://waamb.at').pathname.split('/').at(-1)||'waambat').replace(/\.[^.]*$/,'')+ext,
   type=asset?.original?.type??MIME[ext]??entry.save.type,
   file={...entry.save,src:originalSrc,name:originalName,type,bytes:entry.original.bytes,original:url,originalSrc,originalName,originalBytes:entry.original.bytes};
  const aliases=[url,source,entry.save.src,entry.save.originalSrc,asset?.src,asset?.copy?.src,asset?.original?.src,
   ...(asset?.sources??[]).flatMap(s=>s.srcset.split(', ').map(r=>r.split(' ')[0]))];
  for(const alias of aliases)if(alias)files[alias]=file;
 }
 return files;
}
