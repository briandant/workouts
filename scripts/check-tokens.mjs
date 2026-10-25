// Fails when a raw hex color appears in web source outside the theme file.
// Colors come from tokens in apps/web/src/styles/theme.css.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../apps/web/src/', import.meta.url).pathname;
const allowed = new Set(['styles/theme.css']);
const hex = /#[0-9a-fA-F]{3,8}\b/g;
const bad = [];

(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name) && !allowed.has(relative(root, p))) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (line.match(hex)) bad.push(`apps/web/src/${relative(root, p)}:${i + 1}: ${line.trim()}`);
      });
    }
  }
})(root);

if (bad.length) {
  console.error('Raw hex colors found; use a theme token instead:\n' + bad.join('\n'));
  process.exit(1);
}
