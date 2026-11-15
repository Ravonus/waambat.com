import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch();
for(const w of [390,1512]){
const p=await b.newPage({viewport:{width:w,height:900}});
await p.goto('http://localhost:3287/mechanics',{waitUntil:'networkidle'});
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,200));}scrollTo(0,0)});
await p.waitForTimeout(1000);
console.log(w,await p.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,figs:[...document.querySelectorAll('figure[data-width]')].map(f=>{const r=f.getBoundingClientRect();return [Math.round(r.left),Math.round(r.width)]}),broken:[...document.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).length})));
await p.screenshot({path:`mech-${w}.png`,fullPage:false,clip:{x:0,y:200,width:w,height:900}});
await p.close();}
await b.close();
