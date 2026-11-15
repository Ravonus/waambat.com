import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const publicRoot=new URL('../public/',import.meta.url);
const original=await readFile(new URL('brand/waambat-sigil-original.svg',publicRoot));
await writeFile(new URL('favicon.svg',publicRoot),original);
const sizes=[16,32,48,64];
const images=await Promise.all(sizes.map(size=>sharp(original).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
for(let i=0;i<sizes.length;i++){const start=6+16*i;header[start]=sizes[i];header[start+1]=sizes[i];header.writeUInt16LE(1,start+4);header.writeUInt16LE(32,start+6);header.writeUInt32LE(images[i].length,start+8);header.writeUInt32LE(offset,start+12);offset+=images[i].length;}
await writeFile(new URL('favicon.ico',publicRoot),Buffer.concat([header,...images]));
await sharp(original).resize(180,180,{fit:'contain',background:'#000'}).png().toFile(new URL('apple-touch-icon.png',publicRoot).pathname);
console.log('Prepared SVG, ICO and Apple icons from the original WAAMBAT inscription.');
