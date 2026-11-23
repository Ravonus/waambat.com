import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.argv[2]||'http://localhost:3287',browser=await webkit.launch({headless:true}),results=[];
try{
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,javaScriptEnabled:false,isMobile:viewport.width<500,deviceScaleFactor:viewport.width<500?3:1,ignoreHTTPSErrors:new URL(origin).hostname==='localhost'&&new URL(origin).protocol==='https:'});
  const page=await context.newPage();
  if(new URL(origin).hostname==='localhost'&&new URL(origin).protocol==='http:')await page.route('**/*',async route=>{if(route.request().resourceType()!=='document')return route.continue();const response=await route.fetch(),headers=response.headers();if(headers['content-security-policy'])headers['content-security-policy']=headers['content-security-policy'].replace(/;?\s*upgrade-insecure-requests/g,'');await route.fulfill({response,headers})});
  const response=await page.goto(origin,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  const image=page.locator('[data-hero] img[data-video-first-frame]');
  await image.waitFor();
  const hero=await image.evaluate(async image=>{await image.decode();return{inline:image.currentSrc.startsWith('data:image/webp;base64,'),decoded:image.complete&&image.naturalWidth>0,width:image.naturalWidth,height:image.naturalHeight,priority:image.fetchPriority,loading:image.loading}});
  assert.ok(hero.inline&&hero.decoded);assert.equal(hero.priority,'high');assert.equal(hero.loading,'eager');
  assert.equal(await page.locator('[data-hero] video').count(),0,'The clear cover must be available without a video player or JavaScript');
  const gallery=page.locator('article.original-artwork[data-media-start]').nth(5);
  await gallery.scrollIntoViewIfNeeded();
  const cover=gallery.locator('img[data-video-first-frame]');
  const source=await cover.evaluate(async image=>{await image.decode();return image.currentSrc});
  assert.match(source,/\.webp(?:$|\?)/,'Gallery covers must also load without client startup');
  results.push({viewport,hero,galleryCover:source});await context.close();
 }
 await fs.mkdir('.kerf/audit',{recursive:true});const report={ok:true,origin,results};await fs.writeFile('.kerf/audit/cover-first.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close()}
