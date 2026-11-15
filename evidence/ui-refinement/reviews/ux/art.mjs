import { chromium, base, shot } from './lib.mjs';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
for (const [path, y] of [['/', 1400], ['/', 3000], ['/art-by-waambat', 600], ['/mechanics', 900]]) {
  await page.goto(base + path, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(600);
  for (const [x, yy] of [[640, 400], [500, 300]]) {
    await page.mouse.move(x - 5, yy - 5); await page.mouse.move(x, yy, { steps: 3 }); await page.waitForTimeout(200);
    const r = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); if (!e) return null; const s = getComputedStyle(e); return { el: e.tagName + '.' + String(e.className?.baseVal ?? e.className).slice(0, 50), cursor: s.cursor, p: document.querySelector('.waambat-cursor').style.opacity, st: document.querySelector('.waambat-cursor').dataset.cursorState }; }, [x, yy]);
    console.log(path, y, x, yy, JSON.stringify(r));
    await shot(page, `cursor-art-${path === '/' ? 'home' : path.slice(1)}-${y}-${x}`, { clip: { x: x - 50, y: yy - 40, width: 120, height: 100 } });
  }
}
await b.close();
