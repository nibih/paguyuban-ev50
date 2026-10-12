#!/usr/bin/env node
// Static import checker.
//
// Replaces a full `expo export` bundle when all you need to know is whether
// every import in src/ resolves to something real. Runs in well under a
// second, so it can be run freely without tying up the terminal.
//
//   node scripts/checkImports.mjs
//
// Catches: misspelled modules, imports of files that don't exist, and
// relative paths pointing at the wrong directory.
// Does not catch: runtime errors, or type mismatches inside a module.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const SRC = path.join(ROOT, 'src');
const NM = path.join(ROOT, 'node_modules');

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'];
const INDEX_STUBS = EXTENSIONS.map(e => '/index' + e);

const problems = [];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip vendored / build output
      if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function packageEntryExists(specifier) {
  // "expo-image-picker/subdir" -> treat the package root as the existence test
  const pkgName = specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
  const pkgDir = path.join(NM, pkgName);
  if (!fs.existsSync(pkgDir)) return false;
  if (specifier === pkgName) return true;
  // subpath import: the path after the package name must exist, with or without extension
  const sub = specifier.slice(pkgName.length).replace(/^\//, '');
  const base = path.join(pkgDir, sub);
  return fs.existsSync(base)
    || EXTENSIONS.some(e => fs.existsSync(base + e))
    || INDEX_STUBS.some(e => fs.existsSync(base + e));
}

function relativeExists(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  return fs.existsSync(base)
    || EXTENSIONS.some(e => fs.existsSync(base + e))
    || INDEX_STUBS.some(e => fs.existsSync(base + e));
}

const IMPORT_RE = /(?:^|\n)\s*(?:import\s[^'"]*?from\s*|import\s*\(\s*|export\s[^'"]*?from\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

// ---- phase 1: actually parse the code ---------------------------------
//
// The import scan below is a regex over text. It cannot tell a comment from
// real code, so a file that does not even parse still "passes". That is not
// theoretical: a malformed comment block once shipped here and only failed
// when EAS ran the Metro bundler, wasting a full cloud build.
//
// `node --check` is no substitute — it cannot parse JSX, so it has to be run
// in a mode that skips these files entirely, which is worse than useless
// because it reports success. babel-preset-expo is the same transform Metro
// uses, so anything it rejects will not bundle.
let babel = null;
try {
  babel = (await import('@babel/core')).default;
} catch {
  console.log('note: @babel/core unavailable, skipping the parse check');
}

const parseErrors = [];

if (babel) {
  const allFiles = [...walk(SRC)];
  const appJs = path.join(ROOT, 'App.js');
  if (fs.existsSync(appJs)) allFiles.push(appJs);

  for (const file of allFiles) {
    try {
      babel.transformFileSync(file, {
        presets: ['babel-preset-expo'],
        filename: file,
        babelrc: false,
        configFile: false
      });
    } catch (e) {
      const loc = e?.loc?.line ? `:${e.loc.line}:${e.loc.column ?? 0}` : '';
      const msg = String(e.message || e).split('\n')[0];
      parseErrors.push(`${path.relative(ROOT, file)}${loc}  ${msg}`);
    }
  }
}

if (parseErrors.length) {
  console.log(`SYNTAX ERRORS (${parseErrors.length}) — these will fail the EAS build:\n`);
  for (const p of parseErrors) console.log('  ' + p);
  process.exit(1);
}

for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = IMPORT_RE.exec(text)) !== null) {
    const spec = m[1];
    const line = text.slice(0, m.index).split('\n').length;

    if (spec.startsWith('.') || spec.startsWith('/')) {
      if (!relativeExists(file, spec)) {
        problems.push(`${path.relative(ROOT, file)}:${line}  ->  ${spec}`);
      }
    } else if (spec.startsWith('node:')) {
      // builtin, skip
    } else if (!packageEntryExists(spec)) {
      problems.push(`${path.relative(ROOT, file)}:${line}  ->  ${spec}   (package not installed)`);
    }
  }
}

if (problems.length) {
  console.log(`UNRESOLVED IMPORTS (${problems.length}):\n`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
} else {
  const files = walk(SRC).length;
  console.log(`OK  ${files} files scanned, every import resolves`);
}
