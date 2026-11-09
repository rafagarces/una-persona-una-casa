// Genera los archivos servidos (raíz) a partir de las fuentes legibles en src/.
// Uso: npm ci && npm run build. Lo ejecuta también la GitHub Action build-min.
import { readFileSync, writeFileSync } from 'node:fs';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const js = ['app', 'renderer-v1', 'renderer-v2', 'renderer-v3', 'renderer-v4', 'renderer-v5', 'renderer-v6'];
for (const f of js) {
  const code = readFileSync(`src/${f}.js`, 'utf8');
  const out = await minify(code, { compress: true, mangle: true });
  if (!out.code) throw new Error(`terser devolvió vacío para ${f}.js`);
  writeFileSync(`${f}.js`, out.code + '\n');
}
const css = new CleanCSS().minify(readFileSync('src/ui-v2.css', 'utf8'));
if (css.errors.length) throw new Error(css.errors.join('; '));
writeFileSync('ui-v2.css', css.styles + '\n');
console.log('Generados:', js.map(f => f + '.js').join(', '), '+ ui-v2.css');
