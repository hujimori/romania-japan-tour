#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   Optimize background photos for the web.

   - Walks img/background/ for *.jpg / *.jpeg / *.JPG
   - Resizes the long edge to MAX_DIM, re-encodes JPEG at QUALITY
   - Auto-rotates via EXIF
   - Skips files that are already small enough (idempotent — safe to re-run)
   - Overwrites the original file
   - Emits img/background/manifest.json with the final filename list,
     which js/main.js auto-loads when BG_IMAGE_FILES is empty.

   Usage:
     npm run optimize           # optimize + write manifest
     npm run manifest           # only refresh manifest.json (no resizing)
   ──────────────────────────────────────────────────────────────── */

import { readdir, stat, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const DIR = path.join(ROOT, 'img', 'background');
const MANIFEST = path.join(DIR, 'manifest.json');

const MAX_DIM = 1800;        // long-edge cap in px
const QUALITY = 80;          // JPEG quality
const SKIP_IF_UNDER_KB = 600; // already small? skip re-encode

const manifestOnly = process.argv.includes('--manifest-only');

function isJpeg(name) {
  return /\.(jpe?g)$/i.test(name);
}

async function optimizeOne(name) {
  const fp = path.join(DIR, name);
  const st = await stat(fp);
  const meta = await sharp(fp).metadata();
  const longEdge = Math.max(meta.width || 0, meta.height || 0);

  if (longEdge <= MAX_DIM && st.size <= SKIP_IF_UNDER_KB * 1024) {
    return { name, action: 'skip', from: st.size, to: st.size };
  }

  const buf = await sharp(fp)
    .rotate() // honor EXIF orientation, then strip it
    .resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();

  await writeFile(fp, buf);
  return { name, action: 'optimized', from: st.size, to: buf.length };
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function main() {
  let entries;
  try {
    entries = await readdir(DIR);
  } catch (e) {
    console.error(`Cannot read ${DIR}:`, e.message);
    process.exit(1);
  }

  /* Clean stray .DS_Store before listing */
  for (const e of entries) {
    if (e === '.DS_Store') await unlink(path.join(DIR, e)).catch(() => {});
  }

  const files = entries.filter(isJpeg).sort();

  if (!manifestOnly) {
    console.log(`Optimizing ${files.length} image(s) in img/background/ ...\n`);
    let totalBefore = 0;
    let totalAfter = 0;
    for (const name of files) {
      try {
        const r = await optimizeOne(name);
        totalBefore += r.from;
        totalAfter += r.to;
        const tag = r.action === 'skip' ? 'skip      ' : 'optimized ';
        console.log(`  ${tag} ${name}  ${fmtKB(r.from)} → ${fmtKB(r.to)}`);
      } catch (e) {
        console.warn(`  failed    ${name}  (${e.message})`);
      }
    }
    console.log(
      `\nTotal: ${fmtKB(totalBefore)} → ${fmtKB(totalAfter)}` +
      ` (${((1 - totalAfter / totalBefore) * 100).toFixed(0)}% smaller)\n`,
    );
  }

  /* Re-read after optimization, then emit manifest */
  const finalEntries = (await readdir(DIR)).filter(isJpeg).sort();
  await writeFile(
    MANIFEST,
    JSON.stringify({ files: finalEntries }, null, 2) + '\n',
  );
  console.log(`Wrote manifest: ${path.relative(ROOT, MANIFEST)} (${finalEntries.length} files)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
