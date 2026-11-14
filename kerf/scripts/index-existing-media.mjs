import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve('../public');
const files=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();
const records={};
for(const file of (await files(root)).filter(f=>/\.(png|jpe?g|webp|avif|gif)$/i.test(f))){
 const meta=await sharp(file).metadata();if(!meta.width||!meta.height)continue;
 const src='/'+path.relative(root,file),type=`image/${meta.format==='jpg'?'jpeg':meta.format}`;
 records[src]={kind:meta.format==='jpeg'?'photo':'graphic',src,width:meta.width,height:meta.pageHeight??meta.height,type,sources:[],quality:'original',name:path.basename(file)};
}
await fs.writeFile('src/content/local-media.json',JSON.stringify(records));
console.log(Object.keys(records).length+' local image records');
