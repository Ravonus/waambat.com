import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch();
// One listener per page; each hover resets the tally.
const count=p=>p.evaluate(()=>{window.__n=0;if(!window.__listening){window.__listening=true;document.addEventListener('animationstart',e=>{if(/mosh/.test(e.animationName))window.__n++},true);}});
// desktop hover rest 2s on nav links + caption + logo
{const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(1500);
 console.log('motion',await p.evaluate(()=>document.querySelector('.site-theme')?.dataset.motion));
 for(const sel of ['header nav a.site-nav-link >> nth=1','header nav a.site-nav-link >> nth=3','header a.site-logo']){await count(p);const el=p.locator(sel);const bx=await el.boundingBox();await p.mouse.move(bx.x+bx.width*0.85,bx.y+bx.height*0.8);await p.waitForTimeout(2000);console.log('hover',sel,'bursts in 2s:',await p.evaluate(()=>window.__n));await p.mouse.move(5,5);await p.waitForTimeout(300);}
 // short mouse presses on nav link
 let ok=0;for(const ms of [60,80,100,60,80,100,130,60,90]){await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(800);const el=p.locator('header nav a.site-nav-link >> nth=1');const href=await el.getAttribute('href');const bx=await el.boundingBox();await p.mouse.move(bx.x+bx.width*0.9,bx.y+bx.height*0.85);await p.waitForTimeout(150);await p.mouse.down();await p.waitForTimeout(ms);await p.mouse.up();await p.waitForTimeout(900);if(new URL(p.url()).pathname===href)ok++;}
 console.log('desktop press activations',ok,'/9');await p.close();}
// touch taps in mobile menu
{const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();let ok=0;
 for(const ms of [60,80,100,130,60,90,120,70,110]){await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(800);await p.locator('header button[aria-label=Menu]').tap();await p.waitForTimeout(700);const el=p.locator('#mobile-site-menu a >> nth=1');const href=await el.getAttribute('href');const bx=await el.boundingBox();const c=await p.context().newCDPSession(p);const x=bx.x+bx.width*0.9,y=bx.y+bx.height*0.85;await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.waitForTimeout(ms);await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(1200);if(new URL(p.url()).pathname===href)ok++;}
 console.log('touch menu activations',ok,'/9');
 // calm close
 for(const how of ['x','escape','link']){await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(800);await p.evaluate(()=>document.querySelector('.site-theme').dataset.motion='calm');await p.locator('header button[aria-label=Menu]').tap();await p.waitForTimeout(600);
  if(how==='x')await p.locator('button[aria-label="Close menu"]').tap();else if(how==='escape')await p.keyboard.press('Escape');else await p.locator('#mobile-site-menu a >> nth=2').tap();
  await p.waitForTimeout(1000);console.log('calm',how,JSON.stringify(await p.evaluate(()=>({dialog:!!document.querySelector('#mobile-site-menu'),mainInert:document.querySelector('main')?.inert,menuBtnVis:getComputedStyle(document.querySelector('header button[aria-label=Menu]')).visibility,path:location.pathname}))));}
 // zoom 200%-like: 195px wide viewport, scroll panel, check X stays at top
 await p.setViewportSize({width:195,height:422});await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(800);await p.locator('header button[aria-label=Menu]').tap();await p.waitForTimeout(800);
 console.log('zoom x',JSON.stringify(await p.evaluate(async()=>{const d=document.querySelector('#mobile-site-menu');const x=()=>Math.round(d.querySelector('button[aria-label="Close menu"]').getBoundingClientRect().top);const a=x();d.scrollTop=400;await new Promise(r=>setTimeout(r,200));return {before:a,after:x(),scrolled:d.scrollTop}})));
 await ctx.close();}
await b.close();
