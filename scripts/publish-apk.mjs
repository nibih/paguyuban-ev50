#!/usr/bin/env node
// Stamps the download page (public/unduh/) for a freshly built APK.
//
//   npm run apk:publish -- ~/Downloads/paguyuban-ev50.apk "catatan satu; catatan dua"
//
// Writes public/unduh/version.json from mobile/app.json plus the file itself, so
// the version, size and release notes on screen always describe the APK that is
// actually being served. Commit the result; Vercel rebuilds the site on push.
//
// The APK itself is NOT copied into the repo. It is attached to a GitHub release
// on this repository (which is public, so the asset needs no login) under the
// fixed asset name `paguyuban-ev50.apk`; the page links to
// /releases/latest/download/paguyuban-ev50.apk, so a new release moves the
// download without touching the page.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const META = path.join(ROOT, 'public/unduh/version.json');
const APP_JSON = path.join(ROOT, 'mobile/app.json');

const [apkArg, notesArg] = process.argv.slice(2);

if (!apkArg) {
  console.error('Usage: npm run apk:publish -- <path-to.apk> ["catatan 1; catatan 2"]');
  process.exit(1);
}

const source = path.resolve(apkArg.replace(/^~(?=$|\/)/, process.env.HOME || '~'));
if (!fs.existsSync(source)) {
  console.error(`APK tidak ditemukan: ${source}`);
  process.exit(1);
}

const sizeBytes = fs.statSync(source).size;
if (sizeBytes < 5 * 1024 * 1024) {
  // A release APK is tens of MB. Anything this small is the wrong file — a
  // failed download page, an .aab, or an EAS log — and publishing it would
  // hand drivers a broken installer.
  console.error(`File terlalu kecil (${(sizeBytes / 1024).toFixed(0)} KB) — bukan APK hasil build.`);
  process.exit(1);
}

const hash = crypto.createHash('sha256');
await new Promise((resolve, reject) => {
  fs.createReadStream(source).on('data', (c) => hash.update(c)).on('end', resolve).on('error', reject);
});

const { expo } = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
const notes = String(notesArg || '')
  .split(';')
  .map((n) => n.trim())
  .filter(Boolean);

const meta = {
  version: expo.version,
  sizeBytes,
  sha256: hash.digest('hex'),
  publishedAt: new Date().toISOString().slice(0, 10),
  notes
};
fs.mkdirSync(path.dirname(META), { recursive: true });
fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');

console.log(`✔ ${path.relative(ROOT, META)}  versi ${meta.version}, ${(sizeBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`  sha256 ${meta.sha256}`);
console.log(`
Langkah berikutnya:
  1. Buat release baru di https://github.com/nibih/paguyuban-ev50/releases/new
     dan lampirkan file ${path.basename(source)} dengan nama aset
     "paguyuban-ev50.apk" (nama ini dipakai URL unduhan).
  2. Commit + push supaya Vercel membangun ulang halaman unduh.`);
