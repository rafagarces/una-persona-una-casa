// Regenera el banco de la portada: N casas renderizadas con el propio CasasV2 y la textura
// de papel, rasterizadas a 1077px sobre su color de fondo, WebP q92 + bank/manifest.json.
// Uso: sirve el repo en local (python3 -m http.server 8911) y ejecuta:
//   node scripts/build-bank.cjs bank
// Requiere playwright-core y un Chromium headless (dependencia de desarrollo, no del build CI).
const { chromium } = require('playwright-core');
const fs = require('fs');

const N = 40, PX = 1077, Q = 0.92;
const OUT = process.argv[2] || 'bank';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://127.0.0.1:8911/', { waitUntil: 'load' });
  await page.waitForSelector('#card svg', { timeout: 20000 });
  const paper = await page.evaluate(async () => {
    const blob = await (await fetch('paper.png')).blob();
    return new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  });
  const entries = [];
  for (let i = 0; i < N; i++) {
    const e = await page.evaluate(async ({ i, px, q, paper }) => {
      const seed = (1000003 + i * 7919) >>> 0;
      const host = document.createElement('div');
      document.body.appendChild(host);
      const r = CasasV2.render(host, null, seed);
      const svg = host.firstChild;
      svg.setAttribute('width', px); svg.setAttribute('height', px);
      const xml = new XMLSerializer().serializeToString(svg).replace('href="paper.png"', 'href="' + paper + '"');
      host.remove();
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const cv = document.createElement('canvas'); cv.width = cv.height = px;
      const cx = cv.getContext('2d');
      cx.fillStyle = r.background; cx.fillRect(0, 0, px, px);
      cx.drawImage(img, 0, 0, px, px);
      URL.revokeObjectURL(url);
      return { seed, background: r.background, shared: r.shared, data: cv.toDataURL('image/webp', q) };
    }, { i, px: PX, q: Q, paper });
    const name = 'h' + String(i + 1).padStart(2, '0') + '.webp';
    fs.writeFileSync(OUT + '/' + name, Buffer.from(e.data.split(',')[1], 'base64'));
    entries.push({ f: 'bank/' + name, seed: e.seed, background: e.background, shared: e.shared });
    if ((i + 1) % 10 === 0) console.error(i + 1 + '/' + N);
  }
  fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(entries));
  const total = entries.reduce((a, e) => a + fs.statSync(OUT + '/' + e.f.split('/')[1]).size, 0);
  console.log(JSON.stringify({ count: entries.length, totalKB: Math.round(total / 1024), avgKB: Math.round(total / 1024 / entries.length) }));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
