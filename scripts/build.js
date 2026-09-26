#!/usr/bin/env node
/**
 * Static build script for J.S.HANDLOOM.
 *
 * What it does, in order:
 *   1. Reads the shared partials (header/footer/support-widget) once.
 *   2. Reads the product catalog (data/products.json) once.
 *   3. For every *.html file in the repo root, replaces:
 *        <!--#include NAME-->          -> the matching partial's markup
 *        <!--#products-->               -> all product cards
 *        <!--#products limit=N-->       -> the first N product cards
 *        <!--#category-filters-->       -> filter chip buttons, one per
 *                                          category found in products.json
 *   4. Writes the result into dist/, and copies styles/, scripts/,
 *      images/, and data/ alongside it so dist/ is a complete,
 *      deployable site.
 *
 * No dependencies - just Node's built-in fs/path. Run with:
 *   node scripts/build.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const PARTIALS_DIR = path.join(ROOT, "partials");
const partials = {};
for (const file of fs.readdirSync(PARTIALS_DIR)) {
  if (!file.endsWith(".html")) continue;
  const name = file.replace(/\.html$/, "");
  partials[name] = fs.readFileSync(path.join(PARTIALS_DIR, file), "utf8");
}

const products = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "products.json"), "utf8")
);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function whatsappUrl(message) {
  return (
    "https://api.whatsapp.com/send?phone=%2B917003511630&text=" +
    encodeURIComponent(message)
  );
}

const WHATSAPP_ICON = `<svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`;

function renderCard(product) {
  const name = escapeHtml(product.name);
  const category = escapeHtml(product.category);
  const categorySlug = escapeHtml(product.categorySlug);
  const slug = escapeHtml(product.slug);
  const desc = escapeHtml(product.description);
  const price = escapeHtml(product.price);
  const image = escapeHtml(product.images[0]);
  const colour = escapeHtml(product.colour || "");
  const work = escapeHtml(product.work || "");
  const availability = escapeHtml(product.availability || "");
  const href = whatsappUrl(product.whatsappMessage);

  return `<div class="shop-card" data-category="${categorySlug}" data-colour="${colour}" data-work="${work}" data-availability="${availability}">
  <div class="shop-card-image">
    <img src="${image}" alt="${name}" loading="lazy" width="400" height="400" />
  </div>
  <div class="shop-card-body">
    <p class="shop-card-category">${category}</p>
    <h3 class="shop-card-title">${name}</h3>
    <p class="shop-card-desc">${desc}</p>
    <div class="shop-card-footer">
      <span class="shop-card-price">${price}</span>
      <a class="shop-card-cta" href="${href}" target="_blank" rel="noopener noreferrer">
        ${WHATSAPP_ICON}
        Enquire
      </a>
    </div>
  </div>
</div>`;
}

function renderFilterChips(items) {
  const seen = new Map();
  for (const p of items) {
    if (!seen.has(p.categorySlug)) seen.set(p.categorySlug, p.category);
  }
  let html = `<button type="button" class="shop-filter-chip active" data-category-filter="all">All</button>`;
  for (const [slug, label] of seen) {
    html += `\n      <button type="button" class="shop-filter-chip" data-category-filter="${escapeHtml(
      slug
    )}">${escapeHtml(label)}</button>`;
  }
  return html;
}

function processIncludes(html) {
  return html.replace(/<!--#include\s+([\w-]+)-->/g, (match, name) => {
    if (!(name in partials)) {
      console.warn(`  ! no partial found for include "${name}" - leaving as-is`);
      return match;
    }
    return partials[name];
  });
}

function processProducts(html) {
  html = html.replace(/<!--#products(?:\s+limit=(\d+))?-->/g, (match, limitStr) => {
    const limit = limitStr ? parseInt(limitStr, 10) : products.length;
    return products.slice(0, limit).map(renderCard).join("\n");
  });
  html = html.replace(/<!--#category-filters-->/g, () => renderFilterChips(products));
  return html;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const htmlFiles = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith(".html") && fs.statSync(path.join(ROOT, f)).isFile());

  for (const file of htmlFiles) {
    let html = fs.readFileSync(path.join(ROOT, file), "utf8");
    html = processIncludes(html);
    html = processProducts(html);
    fs.writeFileSync(path.join(DIST, file), html, "utf8");
    console.log("built:", file);
  }

  for (const dir of ["styles", "scripts", "images"]) {
    const srcDir = path.join(ROOT, dir);
    if (fs.existsSync(srcDir)) {
      copyDir(srcDir, path.join(DIST, dir));
      console.log("copied:", dir + "/");
    }
  }
  fs.rmSync(path.join(DIST, "scripts", "build.js"), { force: true });

  // .nojekyll isn't strictly required (upload-pages-artifact bypasses Jekyll),
  // but it's harmless and protects against a future switch to the default
  // Pages build action.
  fs.writeFileSync(path.join(DIST, ".nojekyll"), "");

  console.log(`\nBuild complete -> ${path.relative(ROOT, DIST)}/`);
}

build();
