import { chromium, AXE, BASE, PAGES, OUT, name } from './common.mjs';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch();
const results = {};
for (const [label, vp] of [['desktop',[1440,900]],['phone',[390,844]]]) {
  const c = await browser.newContext({ viewport: {width:vp[0],height:vp[1]}, colorScheme:'dark', reducedMotion:'reduce', isMobile: vp[0]<768, hasTouch: vp[0]<768 });
  for (const p of [...PAGES, '/admin']) {
    const page = await c.newPage();
    const errs = [];
    page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,200)); });
    page.on('pageerror', e => errs.push('pageerror '+e.message.slice(0,200)));
    await page.goto(BASE+p, { waitUntil:'load', timeout:60000 });
    await page.waitForTimeout(2500);
    // scroll through to trigger reveals
    console.error('visiting', label, p, page.url());
    try { await page.evaluate(async () => { for (let y=0; y<document.documentElement.scrollHeight; y+=600) { scrollTo(0,y); await new Promise(r=>setTimeout(r,80)); } scrollTo(0,0); }); } catch (e) { console.error('scroll navigation on', p, page.url()); await page.waitForLoadState('load'); await page.waitForTimeout(1500); }
    await page.waitForTimeout(800);
    await page.addScriptTag({ path: AXE });
    const r = await page.evaluate(async () => await axe.run(document, { resultTypes:['violations','incomplete'] }));
    results[`${label} ${p}`] = {
      errors: errs,
      violations: r.violations.map(v => ({ id:v.id, impact:v.impact, help:v.help, nodes:v.nodes.map(n => ({ target:n.target.join(' '), summary:n.failureSummary?.slice(0,300), html:n.html.slice(0,160) })) })),
      incomplete: r.incomplete.map(v => ({ id:v.id, count:v.nodes.length, sample: v.nodes.slice(0,3).map(n=>({target:n.target.join(' '), msg: (n.any[0]?.message||'').slice(0,160)})) })),
    };
    await page.close();
  }
  await c.close();
}
await browser.close();
writeFileSync(OUT+'axe-after.json', JSON.stringify(results,null,1));
for (const [k,v] of Object.entries(results)) console.log(k, 'violations:', v.violations.map(x=>`${x.id}(${x.impact},${x.nodes.length})`).join(' ')||'none', '| incomplete:', v.incomplete.map(x=>`${x.id}(${x.count})`).join(' '), v.errors.length? '| console errors: '+v.errors.length : '');
