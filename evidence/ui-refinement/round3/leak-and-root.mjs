// Round 3 checks: Vimeo fallback listener leak, theme on :root, scrollbar idle under reduced motion.
import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch();const out={};
const counter=()=>{window.__msg=0;const add=EventTarget.prototype.addEventListener,rem=EventTarget.prototype.removeEventListener;EventTarget.prototype.addEventListener=function(t,...a){if(this===window&&t==='message')window.__msg++;return add.call(this,t,...a)};EventTarget.prototype.removeEventListener=function(t,...a){if(this===window&&t==='message')window.__msg--;return rem.call(this,t,...a)};};
{const p=await b.newPage({viewport:{width:1440,height:900}});await p.addInitScript(counter);
 await p.goto('http://localhost:3287/art-by-waambat',{waitUntil:'load'});await p.waitForTimeout(2500);
 const counts=[await p.evaluate(()=>window.__msg)];
 for(let i=0;i<4;i++){await p.getByRole('button',{name:/View Untld3/}).click();await p.waitForTimeout(3500);await p.getByRole('button',{name:'Close archive viewer'}).click();await p.waitForTimeout(800);counts.push(await p.evaluate(()=>window.__msg));}
 out.vimeoViewerMessageListeners=counts;
 out.rootTheme=await p.evaluate(()=>({accent:document.documentElement.style.getPropertyValue('--ui-accent'),cursor:document.documentElement.style.getPropertyValue('--ui-cursor'),accentColor:getComputedStyle(document.documentElement).accentColor}));
 await p.close();}
{const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const p=await ctx.newPage();
 await p.addInitScript(()=>{window.__draws=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{window.__draws++;cb(t)});});
 await p.goto('http://localhost:3287/',{waitUntil:'load'});await p.waitForTimeout(2500);
 await p.evaluate(()=>window.__draws=0);await p.mouse.wheel(0,1200);await p.waitForTimeout(1500);
 out.reducedMotionRafAfterOneScrollBurst=await p.evaluate(()=>window.__draws);
 await ctx.close();}
console.log(JSON.stringify(out,null,1));await b.close();
