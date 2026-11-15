import {createRequire} from 'module';import fs from 'fs';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch();const p=await b.newPage();
for(const [f,x0,x1] of [['hdr-home-390.png',0,300],['hdr-contact-390.png',90,300],['hdr-home-700.png',0,560],['hdr-contact-700.png',200,520]]){
 const url='data:image/png;base64,'+fs.readFileSync(f).toString('base64');
 console.log(f,await p.evaluate(async([url,x0,x1])=>{const i=new Image();i.src=url;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const d=g.getImageData(0,0,i.width,i.height).data;let top=-1,bot=-1;for(let y=0;y<130;y++){for(let x=x0;x<Math.min(x1,i.width);x++){const k=(y*i.width+x)*4;if(d[k]>200&&d[k+1]<190&&d[k+2]>130){if(top<0)top=y;bot=y;break;}}}return [top,bot,(top+bot)/2]},[url,x0,x1]));
}
await b.close();
