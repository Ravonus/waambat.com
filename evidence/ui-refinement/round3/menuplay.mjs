import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();
await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(800);
await p.locator('header button[aria-label=Menu]').tap();await p.waitForTimeout(600);
const home=p.locator('#mobile-site-menu a[href="/"]');await home.tap();await p.waitForTimeout(1500);
const res=[];for(let y=0;y<6000;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(1200);res.push(await p.evaluate(()=>[...document.querySelectorAll('video')].map(v=>{const r=v.getBoundingClientRect();const vis=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0))/Math.max(1,r.height);return {vis:+vis.toFixed(2),paused:v.paused}}).filter(v=>v.vis>=0.6)));}
console.log('after menu nav to home: visible videos per step',JSON.stringify(res.map(s=>s.map(v=>v.paused?'P':'▶').join(''))));
// X close path keeps its animation and finishes
await p.locator('header button[aria-label=Menu]').tap();await p.waitForTimeout(600);
const t0=Date.now();await p.locator('button[aria-label="Close menu"]').tap();
await p.waitForFunction(()=>!document.querySelector('#mobile-site-menu'),null,{timeout:3000});console.log('x close finished in',Date.now()-t0,'ms');
await b.close();
