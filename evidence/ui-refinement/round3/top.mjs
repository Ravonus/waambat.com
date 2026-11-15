import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();
for(const via of ['direct','menu']){
if(via==='direct'){await p.goto('http://localhost:3287/',{waitUntil:'load'});}else{await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(800);await p.locator('header button[aria-label=Menu]').tap();await p.waitForTimeout(600);await p.locator('#mobile-site-menu a[href="/"]').tap();}
for(const t of [1500,3000,5000]){await p.waitForTimeout(t===1500?1500:(t===3000?1500:2000));
console.log(via,t,JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('video')].map(v=>{const r=v.getBoundingClientRect();return {top:Math.round(r.top),h:Math.round(r.height),vis:getComputedStyle(v).visibility,op:getComputedStyle(v).opacity,paused:v.paused,rs:v.readyState,src:v.currentSrc.split('/').pop().slice(0,20),hero:!!v.closest('[data-hero]'),state:v.closest('[data-playback-state]')?.dataset.playbackState}}).filter(v=>v.top<844))));}}
await b.close();
