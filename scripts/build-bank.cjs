// Regenera el banco de la portada: N casas renderizadas con el propio CasasV2 y la textura
// de papel, rasterizadas a 1360px (2x el tamano maximo en pantalla, 680 CSS px @dpr2)
// CON alfa (el margen fuera del papel queda transparente para que se vea el fondo de la
// pagina, igual que el lienzo del render directo), codificadas WebP q95 metodo 6 con
// ImageMagick + bank/manifest.json. q92 lavaba visiblemente la textura del papel; q95 la
// conserva (~80 KB por casa, ~3,1 MB el banco; se precargan solo las 2 siguientes).
// Uso: sirve el repo en local (python3 -m http.server 8911) y ejecuta:
//   node scripts/build-bank.cjs bank        (escribe bank/hXX.png intermedios)
//   for f in bank/h*.png; do convert "$f" -quality 95 -define webp:method=6 "${f%.png}.webp"; done
//   rm bank/h*.png
// Requiere playwright-core, un Chromium headless e ImageMagick (dependencias de
// desarrollo, no del build CI).
const { chromium } = require('playwright-core');
const fs = require('fs');

const N = 40, PX = 1360;
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
    const e = await page.evaluate(async ({ i, px, paper }) => {
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
      cv.getContext('2d').drawImage(img, 0, 0, px, px);
      URL.revokeObjectURL(url);
      return { seed, background: r.background, shared: r.shared, data: cv.toDataURL('image/png') };
    }, { i, px: PX, paper });
    const name = 'h' + String(i + 1).padStart(2, '0') + '.png';
    fs.writeFileSync(OUT + '/' + name, Buffer.from(e.data.split(',')[1], 'base64'));
    entries.push({ f: 'bank/' + name.replace('.png', '.webp'), seed: e.seed, background: e.background, shared: e.shared });
    if ((i + 1) % 10 === 0) console.error(i + 1 + '/' + N);
  }
  fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(entries));
  console.log(JSON.stringify({ count: entries.length, note: 'PNGs escritos; codifica a WebP q95 con ImageMagick (ver cabecera)' }));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
