#!/usr/bin/env node
// Static checker for the admin panel.
//
//   node scripts/check.mjs
//
// Catches, in well under a second:
//   1. files that do not parse (esbuild, the same JSX parser Vite uses);
//   2. relative imports that point at nothing;
//   3. screens destructuring context fields AppContext does not provide.
//
// (3) is the one worth having. A screen asking for `pettyCash` when the
// context exposes `vault` builds perfectly fine — Vite only resolves imports,
// not object keys — and then renders `undefined.toLocaleString()` at the first
// click. The full `npm run build` cannot see it either. That exact bug was
// found by hand during the panel rewrite; this makes it a test instead of a
// memory.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

const problems = [];
const syntaxErrors = [];
const importErrors = [];

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(jsx?|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const files = walk(SRC);

// ---- 1. parse -------------------------------------------------------------
let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  console.log('note: esbuild unavailable, skipping the parse check');
}

if (esbuild) {
  for (const file of files) {
    try {
      await esbuild.transform(fs.readFileSync(file, 'utf8'), {
        loader: file.endsWith('.x') || file.endsWith('.jsx') ? 'jsx' : 'js',
        jsx: 'automatic'
      });
    } catch (e) {
      const loc = e?.location;
      // esbuild's message opens with a generic "Transform failed" line and
      // puts the actual file:line:col error on the following one — showing
      // only the first line would report a failure with no cause.
      const lines = String(e.message || e).split('\n').filter(Boolean);
      const detail = lines.length > 1 ? lines[1] : lines[0];
      syntaxErrors.push(
        `${path.relative(ROOT, file)}${loc ? `:${loc.line}:${loc.column}` : ''}  ${detail}`
      );
    }
  }
}

// ---- 2. imports -----------------------------------------------------------
const EXT = ['', '.js', '.jsx', '.mjs', '.json', '.ts', '.tsx'];
const INDEX = EXT.map((e) => '/index' + e);

const resolves = (from, spec) => {
  const base = path.resolve(path.dirname(from), spec);
  return EXT.some((e) => fs.existsSync(base + e)) || INDEX.some((i) => fs.existsSync(base + i));
};

const IMPORT_RE = /(?:^|\n)\s*(?:import\s[^'"]*?from\s*|import\s*\(\s*|export\s[^'"]*?from\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = IMPORT_RE.exec(text)) !== null) {
    const spec = m[1];
    if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
    if (!resolves(file, spec)) {
      const line = text.slice(0, m.index).split('\n').length;
      importErrors.push(`${path.relative(ROOT, file)}:${line}  ->  ${spec}`);
    }
  }
}

// ---- 3. context fields ----------------------------------------------------
const ctxFile = path.join(SRC, 'context', 'AppContext.jsx');
const provided = new Set();

if (fs.existsSync(ctxFile)) {
  const ctx = fs.readFileSync(ctxFile, 'utf8');
  // The provider value is one flat object literal: value={{ ... }}
  const valueIdx = ctx.indexOf('value={{');
  if (valueIdx === -1) {
    problems.push('AppContext.jsx: could not find `value={{` — update this checker if the provider shape changed');
  } else {
    // Walk braces from the opening of the value object to its close.
    let i = ctx.indexOf('{{', valueIdx) + 2;
    let depth = 1;
    let buf = '';
    for (; i < ctx.length && depth > 0; i++) {
      const ch = ctx[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') { depth -= 1; if (depth === 0) break; }
      if (depth === 1 && ch === ',') { buf += '\n'; continue; }
      if (depth >= 1) buf += ch;
    }
    // Each line is either `key,` or `key: value,`.
    for (const line of buf.split('\n')) {
      const km = line.match(/^\s*([A-Za-z_$][\w$]*)\s*(?::|,|$)/);
      if (km) provided.add(km[1]);
    }
  }
}

if (provided.size === 0) {
  problems.push('AppContext.jsx: extracted zero context fields — the checker is broken, not the code');
} else {
  for (const file of files) {
    if (file === ctxFile) continue;
    const text = fs.readFileSync(file, 'utf8');
    // const { a, b } = useApp();  — possibly across lines.
    for (const m of text.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*useApp\s*\(/g)) {
      const line = text.slice(0, m.index).split('\n').length;
      for (const raw of m[1].split(',')) {
        const name = raw.split(':')[0].trim();
        if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) continue;
        if (!provided.has(name)) {
          importErrors.push(
            `${path.relative(ROOT, file)}:${line}  useApp() asks for "${name}", which AppContext does not provide`
          );
        }
      }
    }
  }
}

// ---- 4. due months --------------------------------------------------------
// A driver owes from the month they joined, not from the start of the book.
// Both iuran screens, the arrears filters and the member pay screen rely on
// this, so the one branch worth pinning is pinned.
const { MONTHS, COLLECTION_MONTH, dueMonths } = await import('../src/constants.js');

const dueFailures = [];
const expectDue = (label, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    dueFailures.push(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

expectDue('roster tanpa createdAt mulai dari Mei', dueMonths({})[0], MONTHS[0]);
expectDue('bergabung 27/10/2026 mulai dari Oktober', dueMonths({ createdAt: '27/10/2026' })[0], 'Oktober');
expectDue('bergabung setelah periode belum menunggak', dueMonths({ createdAt: '05/01/2027' }), []);
expectDue('bulan terakhir yang dihitung = bulan berjalan', dueMonths({}).at(-1), COLLECTION_MONTH);

// ---- report ---------------------------------------------------------------
let failed = false;

if (syntaxErrors.length) {
  failed = true;
  console.log(`SYNTAX ERRORS (${syntaxErrors.length}) — these will fail the build:\n`);
  for (const p of syntaxErrors) console.log('  ' + p);
  console.log('');
}

if (importErrors.length) {
  failed = true;
  console.log(`UNRESOLVED IMPORTS / CONTEXT FIELDS (${importErrors.length}):\n`);
  for (const p of importErrors) console.log('  ' + p);
  console.log('');
}

if (problems.length) {
  failed = true;
  console.log(`CHECKER PROBLEMS (${problems.length}):\n`);
  for (const p of problems) console.log('  ' + p);
  console.log('');
}

if (dueFailures.length) {
  failed = true;
  console.log(`DUE-MONTH RULES (${dueFailures.length}):\n`);
  for (const p of dueFailures) console.log('  ' + p);
  console.log('');
}

if (failed) process.exit(1);

console.log(
  `OK  ${files.length} files · every file parses · every import resolves · ` +
  `${provided.size} context fields verified against their consumers · ` +
  `4 due-month rules hold`
);
