// Genera los archivos servidos (raíz) a partir de las fuentes legibles en src/.
// Uso: npm ci && npm run build. Lo ejecuta también la GitHub Action build-min.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const js = ['app', 'renderer-v1', 'renderer-v2', 'renderer-v3', 'renderer-v4', 'renderer-v5', 'renderer-v6', 'renderer-examples'];
for (const f of js) {
  const code = readFileSync(`src/${f}.js`, 'utf8');
  const out = await minify(code, { compress: true, mangle: true });
  if (!out.code) throw new Error(`terser devolvió vacío para ${f}.js`);
  writeFileSync(`${f}.js`, out.code + '\n');
}
const css = new CleanCSS().minify(readFileSync('src/ui-v2.css', 'utf8'));
if (css.errors.length) throw new Error(css.errors.join('; '));
writeFileSync('ui-v2.css', css.styles + '\n');
// Un único número de versión para todos los archivos: hash del contenido generado. index.html referencia cada script con ?v=<hash>
// y app.js lo lee de su propia etiqueta para cargar los motores bajo demanda con la misma versión (no hay versiones manuales sueltas).
const h = createHash('sha1');
for (const f of js) h.update(readFileSync(`${f}.js`));
h.update(readFileSync('ui-v2.css'));
const ver = h.digest('hex').slice(0, 10);
let html = readFileSync('index.html', 'utf8');
const html2 = html.replace(/(<script src="(?:app|renderer-[a-z0-9-]+)\.js)\?v=[^"]*"/g, `$1?v=${ver}"`);
if (html2 === html && !html.includes(`?v=${ver}`)) throw new Error('index.html no referencia scripts con ?v=');
writeFileSync('index.html', html2);
console.log('Version unica:', ver);
console.log('Generados:', js.map(f => f + '.js').join(', '), '+ ui-v2.css');
