import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/ravonus/Documents/Codex/2026-10-17/i-x20/work/kerf-media/node_modules/.pnpm/playwright-core@1.64.1_patch_hash=c37622bf578045472b8ad62ab7d049a9b7524c5208472cd532e5f24793f5701b/node_modules/playwright-core');
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900},forcedColors:'active'});const p=await ctx.newPage();
await p.goto('http://localhost:3287/contact',{waitUntil:'load'});await p.waitForTimeout(1500);
for(const path of ['/mechanics','/art-by-waambat']){await p.goto('http://localhost:3287'+path,{waitUntil:'load'});await p.waitForTimeout(1200);console.log(path,await p.evaluate(()=>[...document.querySelectorAll('header nav a')].map(a=>a.getAttribute('href')+(a.getAttribute('aria-current')?'*':'')+':'+getComputedStyle(a).textDecorationLine).join(' ')));}
await b.close();
