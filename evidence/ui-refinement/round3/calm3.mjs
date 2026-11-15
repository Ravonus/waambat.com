import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();
await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(800);
await p.locator('header button[aria-label=Menu]').tap();await p.waitForTimeout(600);
await p.locator('#mobile-site-menu a >> nth=2').tap();
for(const t of [50,150,300,500,800,1500]){await p.waitForTimeout(t-(t===50?0:[50,150,300,500,800,1500][[50,150,300,500,800,1500].indexOf(t)-1]));
console.log(t,JSON.stringify(await p.evaluate(()=>{const h=document.querySelector('header');const d=document.querySelector('#mobile-site-menu');return {path:location.pathname,headerOpen:h.dataset.menuOpen,btn:getComputedStyle(h.querySelector('button[aria-label=Menu]')).visibility,dialog:!!d,open:d?.open,phase:d?.dataset.phase,navOpen:h.getAttribute('data-menu-open'),siteOpen:document.querySelector('.site-theme').dataset.menuOpen,bodyPos:document.body.style.position}})));}
await b.close();
