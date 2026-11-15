import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const slug=process.argv[2];
// 1. archive: Everything tile + viewer
{const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3287/'+slug,{waitUntil:'load'});
const btn=p.getByRole('button',{name:/View Everything/});
await btn.scrollIntoViewIfNeeded();await p.waitForTimeout(2500);
const tile=await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/View Everything/.test(x.getAttribute('aria-label')||''));const card=b.closest('figure,article,li,div[data-save-url]')||b.parentElement.parentElement;const v=card.querySelector('video');const f=card.querySelector('iframe');return {video:v&&{src:v.currentSrc.split('/').pop(),paused:v.paused,t:v.currentTime,rs:v.readyState},iframe:f?.src?.slice(0,60),unavailable:!!card.querySelector('.inline-video-unavailable'),state:card.querySelector('[data-playback-state]')?.dataset.playbackState}});
console.log('tile',JSON.stringify(tile));
await btn.click();await p.waitForTimeout(3000);
console.log('viewer',JSON.stringify(await p.evaluate(()=>{const d=document.querySelector('dialog.archive-viewer');const v=d.querySelector('video');const m=d.querySelector('.archive-viewer-media').getBoundingClientRect();return {video:v&&{src:v.currentSrc.split('/').pop(),paused:v.paused,t:+v.currentTime.toFixed(2),w:v.videoWidth,h:v.videoHeight},iframe:d.querySelector('iframe')?.src?.slice(0,60),unavailable:!!d.querySelector('.inline-video-unavailable'),box:[Math.round(m.width),Math.round(m.height)]}})));
await p.close();}
// 2. scroll autoplay/pause on home + mechanics
for(const path of ['/','/mechanics']){
 const p=await b.newPage({viewport:{width:1440,height:900}});
 await p.goto('http://localhost:3287'+path,{waitUntil:'load'});
 const H=await p.evaluate(()=>document.body.scrollHeight);
 const log=[];
 for(let y=0;y<H;y+=450){
  await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(1300);
  log.push(await p.evaluate(()=>[...document.querySelectorAll('video')].map(v=>{const r=v.getBoundingClientRect();const vis=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0))/Math.max(1,r.height);return {vis:+vis.toFixed(2),paused:v.paused,rs:v.readyState,src:v.currentSrc.split('/').pop().slice(0,16)}})));
 }
 // judge: any video >=60% visible and loaded but paused (bad), any video <5% visible and playing (bad)
 let bad=[];log.forEach((step,i)=>step.forEach(v=>{if(v.vis>=0.6&&v.paused&&v.src)bad.push(['stuck-paused',i,v]);if(v.vis<0.05&&!v.paused)bad.push(['playing-offscreen',i,v]);}));
 const lazy=await p.evaluate(()=>[...document.querySelectorAll('img[data-video-first-frame][loading=lazy]')].map(i=>({complete:i.complete,nat:i.naturalWidth})).slice(0,5));
 console.log(path,'steps',log.length,'videos',Math.max(...log.map(s=>s.length)),'bad',JSON.stringify(bad.slice(0,6)),'lazyAfter',JSON.stringify(lazy));
 await p.close();
}
// 3. lazy still never loaded: complete must be false so the movie waits
{const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://localhost:3287/',{waitUntil:'load'});
console.log('lazy-offscreen',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('img[data-video-first-frame]')].filter(i=>i.getBoundingClientRect().top>innerHeight*3).slice(0,4).map(i=>({complete:i.complete,nat:i.naturalWidth,loading:i.loading})))));await p.close();}
await b.close();
