/**
 * Replace RefreshControl with ThemedRefreshControl (multiline-import safe).
 * Run: node scripts/migrate-refresh-control.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith('.tsx')) acc.push(p);
  }
  return acc;
}

function relImport(fromFile, toFile) {
  let r = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r.replace(/\.tsx$/, '');
}

function stripRefreshFromRnImport(t) {
  return t.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]react-native['"]/gs,
    (full, inner) => {
      if (!/\bRefreshControl\b/.test(inner)) return full;
      const parts = inner
        .split(',')
        .map((s) => s.trim().replace(/\n/g, ' '))
        .filter((s) => s.length > 0 && !/^RefreshControl\b/.test(s));
      const body = parts.join(', ');
      return `import { ${body} } from 'react-native'`;
    },
  );
}

const target = path.join(srcRoot, 'shared', 'components', 'ThemedRefreshControl.tsx');
const files = walk(srcRoot).filter((f) => path.basename(f) !== 'ThemedRefreshControl.tsx');

for (const file of files) {
  let t = fs.readFileSync(file, 'utf8');
  if (!t.includes('RefreshControl')) continue;

  const imp = relImport(file, target);

  t = stripRefreshFromRnImport(t);
  t = t.replace(/<RefreshControl\b/g, '<ThemedRefreshControl');
  t = t.replace(/\s+tintColor=\{colors\.primary\}/g, '');
  t = t.replace(/\s+colors=\{\[colors\.primary\]\}/g, '');

  if (!t.includes(`from '${imp}'`) && !t.includes(`from "${imp}"`)) {
    t = t.replace(
      /(from ['"]react-native['"];?\s*\n)/,
      `$1import ThemedRefreshControl from '${imp}';\n`,
    );
  }

  fs.writeFileSync(file, t);
}

console.log('Done. Run npm run type-check.');
