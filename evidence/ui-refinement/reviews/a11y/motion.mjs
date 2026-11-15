import { chromium, BASE, OUT } from './common.mjs';
const browser = await chromium.launch();
for (const motion of ['reduce','no-preference']) {
  const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:motion });
  const page = await c.newPage();
  await page.goto(BASE+'/contact-waambat', { waitUntil:'load' }); await page.waitForTimeout(2500);
  // cursor
  await page.mouse.move(400,400); await page.mouse.move(420,420); await page.waitForTimeout(300);
  const cursor = await page.evaluate(() => { const s = document.querySelector('.waambat-cursor span'); if (!s) return 'no cursor element'; const cs = getComputedStyle(s); return { anim: cs.animationName, dur: cs.animationDuration, running: s.getAnimations().length, active: document.documentElement.dataset.waambatCursor, popover: document.querySelector('.waambat-cursor').matches(':popover-open') }; });
  // hover nav link -> transitions
  await page.hover('.site-nav-link >> nth=2'); await page.waitForTimeout(30);
  const navTrans = await page.evaluate(() => { const a = document.querySelectorAll('.site-nav-link')[2]; return { transition: getComputedStyle(a).transitionDuration, after: getComputedStyle(a,'::after').transitionDuration, anims: a.getAnimations({subtree:true}).length }; });
  // select open animation
  await page.click('#contact-contact-interest'); await page.waitForTimeout(30);
  const opt = await page.evaluate(() => { const l = document.querySelector('[role=listbox]'); return { anim: getComputedStyle(l).animationName, anims: l.getAnimations().length }; });
  await page.keyboard.press('Escape');
  // submit hover slide
  await page.hover('button[type=submit]'); await page.waitForTimeout(30);
  const sub = await page.evaluate(() => getComputedStyle(document.querySelector('button[type=submit]'),'::before').transitionDuration);
  // forms spinner/skeleton/save spinner/link spinner: computed animation on synthetic elements via CSS classes is module-hashed; inspect stylesheet-driven elements by forcing states
  const forced = await page.evaluate(() => {
    const out = {};
    // nav pending spinner
    const link = document.querySelectorAll('.site-nav-link')[1]; link.setAttribute('data-pending',''); const lp = link.querySelector('[class*=linkProgress]'); out.linkSpinner = getComputedStyle(lp).animationName + ' running=' + lp.getAnimations().length; link.removeAttribute('data-pending');
    // save dialog spinner (closed dialog => display none; clone outside)
    const sp = document.querySelector('.waambat-download-progress'); const clone = sp.cloneNode(true); document.body.append(clone); out.saveSpinner = getComputedStyle(clone.querySelector('span')).animationName + ' running=' + clone.querySelector('span').getAnimations().length; clone.remove();
    // skeleton shimmer
    const sk = document.createElement('div'); sk.className = 'waambat-skeleton'; sk.innerHTML = '<div class="waambat-skeleton-art"></div><div class="waambat-skeleton-line"></div>'; document.body.append(sk); out.skeleton = getComputedStyle(sk.firstChild).animationName + ' running=' + sk.firstChild.getAnimations().length; sk.remove();
    return out;
  });
  // open Save dialog to see spinner briefly & dialog-in animation
  await page.locator('main img').first().click({ button:'right' }); await page.waitForTimeout(20);
  const dlg = await page.evaluate(() => { const d = document.querySelector('.waambat-download'); return { dialogAnim: getComputedStyle(d).animationName, running: d.getAnimations({subtree:true}).map(a => a.animationName || a.transitionProperty).join(',') }; });
  await page.keyboard.press('Escape');
  // total running animations on page
  const all = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName||a.transitionProperty||'anim') + '@' + (a.effect?.target?.className?.toString?.().slice(0,30) || a.effect?.target?.tagName)).slice(0,20));
  console.log(`\n== prefers-reduced-motion: ${motion}`);
  console.log('cursor', JSON.stringify(cursor)); console.log('nav hover transition', JSON.stringify(navTrans)); console.log('listbox', JSON.stringify(opt)); console.log('submit ::before transition', sub); console.log('forced', JSON.stringify(forced)); console.log('save dialog', JSON.stringify(dlg)); console.log('running animations', JSON.stringify(all));
  await c.close();
}
// skeleton/progress during real navigation, reduce
{
  const c = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce' });
  const page = await c.newPage();
  await page.route('**/*', async (route) => { if (route.request().url().includes('_kerf') && route.request().resourceType() === 'fetch') await new Promise(r => setTimeout(r, 1500)); route.continue(); });
  await page.goto(BASE+'/bio-waambat', { waitUntil:'load' }); await page.waitForTimeout(2000);
  await page.click('.site-nav-link >> text=art archive', { noWaitAfter:true }); await page.waitForTimeout(400);
  const st = await page.evaluate(() => document.getAnimations().filter(a => a.playState==='running').map(a => (a.animationName||a.transitionProperty) + '@' + (a.effect?.target?.className?.toString?.().slice(0,40)||'')));
  const pending = await page.evaluate(() => !!document.querySelector('[data-pending]') + ' bones=' + document.querySelectorAll('[class*=bone]').length + ' progress=' + document.querySelectorAll('[class*=progress]').length);
  await page.screenshot({ path: OUT+'shots/nav-pending-reduce.png' });
  console.log('\n== during slow navigation (reduce): running=', JSON.stringify(st), 'state', pending);
  await c.close();
}
await browser.close();
