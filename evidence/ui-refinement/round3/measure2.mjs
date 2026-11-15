import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch();
for(const path of ['/','/contact']) for(const w of [390,700]){
 const p=await b.newPage({viewport:{width:w,height:800}});
 await p.goto('http://localhost:3287'+path,{waitUntil:'networkidle'});
 const r=await p.evaluate(()=>{
  const ink=sel=>{const e=document.querySelector(sel);if(!e)return null;const c=e.getBoundingClientRect();if(!c.height)return 'hidden';const rg=document.createRange();rg.selectNodeContents(e);const g=rg.getBoundingClientRect();return {box:[c.top,c.bottom].map(n=>+n.toFixed(1)),text:[g.top,g.bottom].map(n=>+n.toFixed(1)),fs:getComputedStyle(e).fontSize}};
  const b=document.querySelector('header button[aria-label=Menu] svg').getBoundingClientRect();
  return {hero:ink('[data-hero-wordmark] a'),logo:ink('header a.site-logo'),glyph:[b.top,b.bottom]}});
 console.log(path,w,JSON.stringify(r));
 await p.screenshot({path:`hdr-${path.replace('/','')||'home'}-${w}.png`,clip:{x:0,y:0,width:w,height:180}});
 await p.close();
}
await b.close();
