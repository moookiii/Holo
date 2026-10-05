import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const baseUrl = process.env.GALLERY_URL || 'http://127.0.0.1:5173', options = { headless: true };
if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
try {
  const page = await browser.newPage();
  await page.route(`${baseUrl}/picker-harness`, route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
  await page.goto(`${baseUrl}/picker-harness`);
  const report = await page.evaluate(async () => {
    const { createUI } = await import('/src/ui/PresentationUI.ts');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const cards = Array.from({ length: 120 }, (_, i) => ({ id: String(i), title: `Card ${i}`, franchise: 'Original',
      set: 'Test', number: String(i), front: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      back: '/back.png', profile: 'print-only', seed: i,
      dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 } }));
    const root = document.createElement('div'); document.body.append(root);
    const nothing = () => {}, ui = createUI(root, cards, [{ id: 'print-only', name: 'Print', family: 'Print' }], {
      lighting: { azimuth: -30, elevation: 35, intensity: 1, speed: 1, filterAngle: 0, playing: true },
      card: nothing, profile: nothing, importCard: nothing, removeCard: nothing, flip: nothing, reset: nothing,
      light: nothing, gallery: nothing, pack: nothing,
    });
    check(root.querySelectorAll('.card-option').length === 0, 'The hidden picker must not construct card buttons at startup');
    ui.selectCard('119'); root.querySelector('#card-toggle').click();
    check(root.querySelectorAll('.card-option').length === cards.length, 'Opening the picker must immediately offer the complete catalog');
    check(root.querySelector('[data-card-id="119"]').getAttribute('aria-pressed') === 'true', 'A selection made before first opening must be reflected');
    const search = root.querySelector('#card-search'); search.value = 'Card 119'; search.dispatchEvent(new Event('input'));
    check(root.querySelectorAll('.card-option').length === 1, 'Search must find entries outside the initial viewport');
    ui.close(); cards.pop(); ui.refreshCards();
    root.querySelector('#card-toggle').click();
    check(root.querySelectorAll('.card-option').length === 0, 'Opening after a hidden catalog refresh must not retain removed search matches');
    search.value = ''; search.dispatchEvent(new Event('input'));
    check(root.querySelectorAll('.card-option').length === cards.length, 'Clearing search must restore the updated complete catalog');
    cards.push({ ...cards[0], id: 'new', title: 'New import', imported: true }); ui.refreshCards();
    check(root.querySelector('[data-card-id="new"]'), 'Catalog updates while open must appear immediately');
    ui.dispose(); root.remove();
    return { passed: ['hidden picker deferred', 'complete first opening', 'selected state', 'complete search', 'hidden refresh', 'visible refresh'] };
  });
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
