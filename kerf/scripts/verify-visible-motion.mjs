import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.argv[2]||'http://localhost:3287',out='.kerf/audit';
await fs.mkdir(out,{recursive:true});
const browser=await webkit.launch({headless:true}),results=[];
try{
 const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'no-preference',ignoreHTTPSErrors:new URL(origin).hostname==='localhost'&&new URL(origin).protocol==='https:'}),p=await c.newPage();
 if(new URL(origin).hostname==='localhost'&&new URL(origin).protocol==='http:')await p.route('**/*',async route=>{if(route.request().resourceType()!=='document')return route.continue();const response=await route.fetch(),headers=response.headers();headers['content-security-policy']=headers['content-security-policy']?.replace(/;?\s*upgrade-insecure-requests/g,'');await route.fulfill({response,headers})});
 await p.addInitScript(()=>Object.defineProperty(window,'MediaSource',{value:undefined,configurable:true}));
 await p.goto(origin,{waitUntil:'domcontentloaded'});
 for(const [label,stage]of [['hero',p.locator('[data-hero]')],['gallery',p.locator('article.original-artwork[data-media-start]').nth(5)]]){
  await stage.scrollIntoViewIfNeeded();
  await p.waitForFunction(el=>{const v=el.querySelector('video'),picture=el.querySelector('picture');return v&&!v.paused&&v.currentTime>.5&&getComputedStyle(picture).opacity==='0'},await stage.elementHandle());
  const v=stage.locator('video').first(),time=await v.evaluate(v=>v.currentTime);
  const a=await v.screenshot({animations:'allow'});
  await p.waitForFunction(({el,time})=>{const v=el.querySelector('video');return !v.paused&&(v.currentTime>time+1||v.currentTime<time-.1)}, {el:await stage.elementHandle(),time});
  const b=await v.screenshot({animations:'allow'}),meta=await sharp(a).metadata();
  const region={left:Math.floor(meta.width*.45),top:Math.floor(meta.height*.3),width:Math.floor(meta.width*.45),height:Math.floor(meta.height*.45)};
  const [x,y]=await Promise.all([a,b].map(buf=>sharp(buf).extract(region).removeAlpha().raw().toBuffer()));
  let difference=0,changed=0;for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);difference+=d;if(d>3)changed++}
  const mean=difference/x.length,fraction=changed/x.length;
  assert.ok(mean>.1&&fraction>.005,`${label} must actually change visible pixels, not just advance its clock`);
  await sharp(a).resize({width:390}).png().toFile(`${out}/${label}-visible-start.png`);
  await sharp(b).resize({width:390}).png().toFile(`${out}/${label}-visible-next.png`);
  results.push({label,meanPixelChange:mean,changedFraction:fraction});
 }
 const report=JSON.stringify({ok:true,origin,results},null,2)+'\n';await fs.writeFile(out+'/visible-motion.json',report);console.log(report);
}finally{await browser.close()}
