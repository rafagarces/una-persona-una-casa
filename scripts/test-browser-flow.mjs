// Recorrido real en Chrome (emulación móvil): portada en reposo, galería, visor, cierre y vuelta.
// Necesita Chrome/Chromium (CHROME=ruta o google-chrome). Sirve el repo en local; no escribe nada en red.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = createServer(async (q, r) => {
  try { const p = normalize(decodeURIComponent(q.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''); const f = join(root, p.endsWith('/') ? p + 'index.html' : p); r.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); r.end(await readFile(f)); }
  catch { r.writeHead(404); r.end(); }
}).listen(0);
await new Promise(r => srv.on('listening', r));
const url = `http://127.0.0.1:${srv.address().port}/index.html`, port = 9300 + Math.floor(Math.random() * 500);
const ch = spawn(process.env.CHROME || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=/tmp/flowprof' + Math.random(), 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Espera hasta que la condición se cumpla (máx. ms): evita falsos fallos por esperas fijas en equipos lentos; si no llega, el fallo dice qué se vio.
const waitFor = async (ev, expr, ms = 15000) => { const t = Date.now(); let v; while (Date.now() - t < ms) { v = await ev(expr); if (v) return v; await sleep(150); } return v; };
let ws, id = 0; const pend = {};
try {
  let tabs; for (let i = 0; i < 30; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.find(t => t.type === 'page')) break; } catch {} await sleep(300); }
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  // Casas de visitante sintéticas (sin datos reales) servidas en lugar de /gallery, para recorrer la galería con SVG de visitante.
  const house = i => { const d = (x, y) => [x + i % 5, y]; const piece = (kind, color, o) => ({ v: 2, kind, color, material: 'pencil', outline: o, marks: [] });
    return { v: 1, rv: 6, seed: 1000 + i, bg: '#e3b5a1', id: 'test-' + i, layers: [
      { kind: 'wall', pieces: [piece('wall', '#4a6a9e', [d(24, 85.5), d(23.2, 47.3), d(77.7, 49.4), d(76.2, 81)])] },
      { kind: 'door', pieces: [piece('door', '#f0e7d8', [d(45.8, 85.4), d(45.4, 65.7), d(63.4, 69.5), d(62.9, 85.1)])] },
      { kind: 'roof', pieces: [piece('roof', '#f0e7d8', [d(19.6, 49.1), d(48.7, 22.1), d(59.2, 35.5), d(81.6, 37.6), d(84.1, 51.6)])] }] }; };
  const fixture = JSON.stringify({ houses: Array.from({ length: 12 }, (_, i) => house(i)), next: null });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) pend[m.id](m.result);
    else if (m.method === 'Fetch.requestPaused') ws.send(JSON.stringify({ id: ++id, method: 'Fetch.fulfillRequest', params: { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: '*' }], body: Buffer.from(fixture).toString('base64') } })); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.value;
  if (process.env.CPU) await send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*workers.dev/gallery*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url }); await sleep(3500);
  // 1. Portada en reposo: sin motores de galería ni sonda.
  assert.equal(await ev("document.querySelectorAll('script[src*=\"renderer-v1\"],script[src*=\"renderer-v3\"],script[src*=\"renderer-v4\"]').length"), 0, 'la portada no carga motores de galería en reposo');
  assert.equal(await ev("document.querySelectorAll('.gallery-card').length"), 0);
  // 2. Una sola versión en todos los scripts.
  const vs = JSON.parse(await ev("JSON.stringify([...document.querySelectorAll('script[src]')].map(s=>new URL(s.src).searchParams.get('v')))"));
  assert.ok(vs.length >= 4 && vs.every(v => v && v === vs[0]), 'versión única: ' + vs);
  // 3. Galería.
  await ev("document.getElementById('open-gallery').click();0"); await waitFor(ev, "document.querySelectorAll('.gallery-card').length>=42"); await sleep(1500);
  const cards = await ev("document.querySelectorAll('.gallery-card').length"); assert.ok(cards >= 42, 'tarjetas: ' + cards);
  const live = await ev("document.querySelectorAll('.gallery-card svg').length"); assert.ok(live < 25, 'SVG vivos acotados: ' + live);
  const empty = await ev("(()=>{const c=document.querySelector('#content').getBoundingClientRect();return [...document.querySelectorAll('.gallery-card')].filter(k=>{const r=k.getBoundingClientRect();return r.bottom>c.top&&r.top<c.bottom&&!k.querySelector('svg,canvas,img')}).length})()");
  assert.equal(empty, 0, 'tarjetas vacías en pantalla');
  const h0 = await ev("document.querySelector('#gallery-grid').scrollHeight");
  for (const y of [900, 2200, 3600, 99999, 0]) { await ev(`document.querySelector('#content').scrollTop=${y};0`); await sleep(900); }
  assert.equal(await ev("document.querySelector('#gallery-grid').scrollHeight"), h0, 'altura de la galería estable');
  await waitFor(ev, "document.querySelectorAll('.gallery-card canvas').length>0");
  const vis = await ev("document.querySelectorAll('.gallery-card canvas').length"); assert.ok(vis > 0, 'las casas de visitante se rasterizan como miniatura');
  console.log('miniaturas rasterizadas de visitantes:', vis, '| tarjetas de visitante:', await ev("document.querySelectorAll('.gallery-card').length-30"));
  // 4. Visor: abrir, avanzar, cerrar con botón y con Escape.
  const t0 = await ev("document.querySelector('.gallery-card')?1:0"); assert.equal(t0, 1, 'hay tarjetas');
  await ev("document.querySelector('.gallery-card').click();0"); await waitFor(ev, "document.getElementById('viewer').open"); await sleep(1200);
  assert.equal(await ev("document.getElementById('viewer').open"), true, 'el visor se abre al pulsar una tarjeta');
  assert.equal(await ev("document.body.classList.contains('viewer-open')"), true, 'clase viewer-open con el visor abierto');
  await ev("document.getElementById('viewer-next').click();0"); await waitFor(ev, "/^2 \\//.test(document.getElementById('viewer-count').textContent)", 8000);
  assert.match(await ev("document.getElementById('viewer-count').textContent"), /^2 \//, 'el visor avanza a 2');
  const closeMs = await ev("(async()=>{const t=performance.now();document.getElementById('viewer-close').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Math.round(performance.now()-t)})()");
  assert.ok(closeMs < 250, 'cierre al siguiente fotograma: ' + closeMs + ' ms');
  assert.equal(await ev("document.getElementById('viewer').open"), false, 'el botón cierra el visor');
  assert.equal(await ev("document.body.classList.contains('viewer-open')"), false, 'se quita viewer-open al cerrar');
  await ev("document.querySelector('.gallery-card').click();0"); await waitFor(ev, "document.getElementById('viewer').open"); await sleep(500);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await waitFor(ev, "!document.getElementById('viewer').open", 4000);
  assert.equal(await ev("document.getElementById('viewer').open"), false, 'Escape cierra el visor');
  // 5. Volver a la portada: sin SVG de galería; volver a la galería conserva el orden.
  const order = await ev("[...document.querySelectorAll('.gallery-card')].map(k=>k.getAttribute('aria-label')).join('|')");
  await ev("document.getElementById('brand').click();0"); await waitFor(ev, "document.querySelectorAll('#gallery-grid svg').length===0", 6000);
  const svgsGal = await ev("document.querySelectorAll('#gallery-grid svg').length"); assert.equal(svgsGal, 0, 'ninguna tarjeta de la galería conserva SVG vivo al volver a la portada (hay ' + svgsGal + ')');
  await ev("document.getElementById('open-gallery').click();0"); await sleep(1500);
  assert.equal(await ev("[...document.querySelectorAll('.gallery-card')].map(k=>k.getAttribute('aria-label')).join('|')"), order, 'orden estable');
  console.log('PASS: portada en reposo, versión única, galería acotada sin tarjetas vacías, visor abre/avanza/cierra (botón y Escape), vuelta estable');
} catch (e) { console.error(e); process.exitCode = 1; } finally { ch.kill(); srv.close(); setTimeout(() => process.exit(process.exitCode || 0), 200); }
