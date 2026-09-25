#!/usr/bin/env node
/**
 * One-time image optimization script.
 * - Compresses existing JPEGs in-place (overwrites originals).
 * - Generates WebP variants alongside each JPEG/PNG.
 * - Resizes to sensible display caps so no image exceeds ~150 KB.
 *
 * Usage: node scripts/optimize-images.js
 * Requires: sharp (already in node_modules)
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const IMAGES = path.join(path.resolve(__dirname, ".."), "images");

const JOBS = [
  // Showcase images: rendered at ≤ 384px (main) / ≤ 192px (sides) on desktop,
  // so 768px / 400px caps cover 2× retina without waste.
  { file: "main-saree.jpg",             maxW: 768,  jpgQ: 72, webpQ: 78 },
  { file: "side-saree-1.jpg",           maxW: 400,  jpgQ: 80, webpQ: 82 },
  { file: "side-saree-2.jpg",           maxW: 400,  jpgQ: 80, webpQ: 82 },
  { file: "side-saree-3.jpg",           maxW: 400,  jpgQ: 80, webpQ: 82 },
  { file: "side-saree-4.jpg",           maxW: 400,  jpgQ: 80, webpQ: 82 },
  // CSS background images: 1440px covers all screens with WebP gains.
  { file: "hero-banner.jpg",            maxW: 1920, jpgQ: 78, webpQ: 80 },
  { file: "coming-soon-background.jpg", maxW: 1440, jpgQ: 68, webpQ: 70 },
  // Coming-soon cartoon: rendered at ≤ 160px (10rem), 320px covers 2× retina.
  { file: "saree-cartoon.png",          maxW: 320,  webpQ: 85, keepPng: true },
];

async function optimise({ file, maxW, jpgQ, webpQ, keepPng }) {
  const srcPath = path.join(IMAGES, file);
  const base = path.basename(file, path.extname(file));
  const ext = path.extname(file).slice(1).toLowerCase();

  const meta = await sharp(srcPath).metadata();
  const outW = Math.min(maxW, meta.width);
  const outH = Math.round(meta.height * (outW / meta.width));

  // --- WebP output ---
  const webpPath = path.join(IMAGES, base + ".webp");
  await sharp(srcPath)
    .resize({ width: outW, withoutEnlargement: true })
    .webp({ quality: webpQ })
    .toFile(webpPath);
  const webpKB = Math.round(fs.statSync(webpPath).size / 1024);

  // --- Compressed source format ---
  let srcKB = null;
  if (ext === "jpg" || ext === "jpeg") {
    const tmp = srcPath + ".tmp";
    await sharp(srcPath)
      .resize({ width: outW, withoutEnlargement: true })
      .jpeg({ quality: jpgQ, progressive: true })
      .toFile(tmp);
    fs.renameSync(tmp, srcPath);
    srcKB = Math.round(fs.statSync(srcPath).size / 1024);
  } else if (keepPng) {
    const tmp = srcPath + ".tmp";
    await sharp(srcPath)
      .resize({ width: outW, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(tmp);
    fs.renameSync(tmp, srcPath);
    srcKB = Math.round(fs.statSync(srcPath).size / 1024);
  }

  const srcLabel = srcKB !== null ? ` | ${ext}: ${srcKB} KB` : "";
  console.log(`${file} -> ${outW}×${outH}  webp: ${webpKB} KB${srcLabel}`);
  return { file, outW, outH };
}

(async () => {
  console.log("Optimising images in", IMAGES, "\n");
  for (const job of JOBS) {
    await optimise(job);
  }
  console.log("\nDone. Re-run `npm run build` to pick up the new WebP files.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
