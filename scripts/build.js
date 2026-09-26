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

// opts.imgPrefix  — prepended to image src (e.g. "../" for sub-pages)
// opts.pdpDir     — directory prefix for the PDP link (default "products/", "" when already inside products/)
function renderCard(product, opts) {
  const imgPrefix = (opts && opts.imgPrefix) || "";
  const pdpDir    = (opts && opts.pdpDir !== undefined) ? opts.pdpDir : "products/";

  const name         = escapeHtml(product.name);
  const category     = escapeHtml(product.category);
  const categorySlug = escapeHtml(product.categorySlug);
  const slug         = escapeHtml(product.slug);
  const desc         = escapeHtml(product.description);
  const price        = escapeHtml(product.price);
  const image        = escapeHtml(imgPrefix + product.images[0]);
  const colour       = escapeHtml(product.colour || "");
  const work         = escapeHtml(product.work || "");
  const availability = escapeHtml(product.availability || "");
  const href         = whatsappUrl(product.whatsappMessage);
  const pdpHref      = pdpDir + slug + ".html";

  return `<div class="shop-card" data-category="${categorySlug}" data-colour="${colour}" data-work="${work}" data-availability="${availability}">
  <a class="shop-card-image-link" href="${pdpHref}">
    <div class="shop-card-image">
      <img src="${image}" alt="${name}" loading="lazy" width="400" height="400" />
    </div>
  </a>
  <div class="shop-card-body">
    <p class="shop-card-category">${category}</p>
    <h3 class="shop-card-title">${name}</h3>
    <p class="shop-card-desc">${desc}</p>
    <div class="shop-card-footer">
      <span class="shop-card-price">${price}</span>
      <div class="shop-card-actions">
        <a class="shop-card-view" href="${pdpHref}">View →</a>
        <a class="shop-card-cta" href="${href}" target="_blank" rel="noopener noreferrer">
          ${WHATSAPP_ICON}
          Enquire
        </a>
      </div>
    </div>
  </div>
</div>`;
}

// Rewrite local-relative paths to ../ for pages one level deep (e.g. products/<slug>.html)
function adjustPathsForSubdir(html) {
  return html
    .replace(/\bhref="(?!https?:\/\/|\/\/|#|\.\.\/)([\w])/g, 'href="../$1')
    .replace(/\bsrc="(?!https?:\/\/|\/\/|\.\.\/)([\w])/g, 'src="../$1');
}

function renderPDP(product) {
  const similar = products
    .filter(p => p.categorySlug === product.categorySlug && p.slug !== product.slug)
    .slice(0, 4);

  const name         = escapeHtml(product.name);
  const category     = escapeHtml(product.category);
  const slug         = escapeHtml(product.slug);
  const price        = escapeHtml(product.price);
  const description  = escapeHtml(product.description);
  const fabricDetails = escapeHtml(product.fabricDetails || "");
  const colour       = escapeHtml(product.colour || "");
  const work         = escapeHtml(product.work || "");
  const availability = escapeHtml(product.availability || "");
  const whatsappHref = whatsappUrl(product.whatsappMessage);
  const mainImage    = escapeHtml("../" + product.images[0]);

  const thumbsHtml = product.images.length > 1
    ? `<div class="pdp-thumbs">${product.images.map((img, i) =>
        `<button class="pdp-thumb${i === 0 ? " active" : ""}" data-img="../${escapeHtml(img)}">
          <img src="../${escapeHtml(img)}" alt="${name} view ${i + 1}" loading="lazy" />
        </button>`
      ).join("\n")}</div>`
    : "";

  const availabilityTag = availability
    ? `<span class="pdp-tag pdp-tag--availability">${availability}</span>` : "";
  const colourTag = colour && colour !== "TBD"
    ? `<span class="pdp-tag">${colour}</span>` : "";
  const workTag = work && work !== "TBD"
    ? `<span class="pdp-tag">${work}</span>` : "";

  const similarHtml = similar.length > 0
    ? `<section class="pdp-similar">
    <h2>Similar Sarees</h2>
    <div class="shop-grid">
      ${similar.map(p => renderCard(p, { imgPrefix: "../", pdpDir: "" })).join("\n")}
    </div>
  </section>`
    : "";

  const headerHtml = adjustPathsForSubdir(partials["header"] || "");
  const footerHtml = adjustPathsForSubdir(partials["footer"] || "");
  const widgetHtml = adjustPathsForSubdir(partials["support-widget"] || "");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name} - J.S.HANDLOOM</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="https://swapnadeep2k.github.io/J.S.HANDLOOM/products/${slug}.html" />
    <link rel="icon" href="../images/logo-orange.png" />
    <meta property="og:title" content="${name} - J.S.HANDLOOM" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="https://swapnadeep2k.github.io/J.S.HANDLOOM/${escapeHtml(product.images[0])}" />
    <meta property="og:type" content="website" />
    <link rel="stylesheet" href="../styles/tokens.css" />
    <link rel="stylesheet" href="../styles/general.css" />
    <link rel="stylesheet" href="../styles/header.css" />
    <link rel="stylesheet" href="../styles/footer.css" />
    <link rel="stylesheet" href="../styles/support-widget.css" />
    <link rel="stylesheet" href="../styles/shop.css" />
    <link rel="stylesheet" href="../styles/pdp.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous" />
  </head>
  <body>
    ${headerHtml}

    <nav class="pdp-breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Home</a>
      <span aria-hidden="true">›</span>
      <a href="../shop.html">Shop</a>
      <span aria-hidden="true">›</span>
      <a href="../collections/${escapeHtml(product.categorySlug)}.html">${category}</a>
      <span aria-hidden="true">›</span>
      <span>${name}</span>
    </nav>

    <main class="pdp-main">
      <div class="pdp-gallery">
        <div class="pdp-gallery-main">
          <img id="pdp-main-img" src="${mainImage}" alt="${name}" width="600" height="600" />
        </div>
        ${thumbsHtml}
      </div>

      <div class="pdp-info">
        <p class="pdp-category">${category}</p>
        <h1 class="pdp-title">${name}</h1>
        <div class="pdp-tags">
          ${availabilityTag}
          ${colourTag}
          ${workTag}
        </div>
        <p class="pdp-price">${price}</p>
        <p class="pdp-fabric-details">${fabricDetails}</p>
        <a class="pdp-cta" href="${whatsappHref}" target="_blank" rel="noopener noreferrer">
          ${WHATSAPP_ICON}
          Enquire on WhatsApp
        </a>
        <a class="pdp-back" href="../shop.html">&#8592; Back to Shop</a>
      </div>
    </main>

    ${similarHtml}

    ${footerHtml}
    ${widgetHtml}
  </body>
  <script src="../scripts/header.js"></script>
  <script src="../scripts/support-widget.js"></script>
  <script>
    (function() {
      var thumbs = document.querySelectorAll(".pdp-thumb");
      var mainImg = document.getElementById("pdp-main-img");
      if (!thumbs.length || !mainImg) return;
      thumbs.forEach(function(btn) {
        btn.addEventListener("click", function() {
          mainImg.src = btn.getAttribute("data-img");
          thumbs.forEach(function(b) { b.classList.remove("active"); });
          btn.classList.add("active");
        });
      });
    })();
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js" integrity="sha384-I7E8VVD/ismYTF4hNIPjVp/Zjvgyol6VFvRkX/vR+Vc4jQkC+hVqc2pM8ODewa9r" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js" integrity="sha384-0pUGZvbkm6XF6gxjEnlmuGrJXVbNuzT9qBBavbLwCsOGabYfZo0T0to5eqruptLy" crossorigin="anonymous"></script>
</html>`;
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
  html = html.replace(/<!--#collections-->/g, () => renderCollectionCards());
  html = html.replace(/<!--#filter-bar-->/g, () => renderFilterBar());
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

// pool: which products to derive option values from
// showCategory: include the Collection dropdown (false on category pages)
function renderFilterBar(pool, showCategory) {
  pool         = pool || products;
  showCategory = showCategory !== false;

  const categories = [...new Map(products.map(p => [p.categorySlug, p.category])).entries()];
  const colours    = [...new Set(pool.map(p => p.colour).filter(v => v && v !== "TBD"))].sort();
  const works      = [...new Set(pool.map(p => p.work).filter(v => v && v !== "TBD"))].sort();
  const avails     = [...new Set(pool.map(p => p.availability).filter(v => v && v !== "TBD"))].sort();

  const opts = (arr) => arr.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  const catOpts = categories.map(([slug, name]) =>
    `<option value="${escapeHtml(slug)}">${escapeHtml(name)}</option>`).join("");

  const categorySelect = showCategory ? `<select class="shop-filter-select" data-filter="category" aria-label="Filter by category">
      <option value="">All Collections</option>
      ${catOpts}
    </select>` : "";

  return `<div class="shop-filter-section">
  <div class="shop-filter-header">
    <span class="shop-filter-label">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Filters
    </span>
    <span class="shop-result-count" id="shop-result-count">${pool.length} sarees</span>
  </div>
  <div class="shop-filter-bar" id="shop-filter-bar">
    ${categorySelect}
    <select class="shop-filter-select" data-filter="colour" aria-label="Filter by colour">
      <option value="">All Colours</option>
      ${opts(colours)}
    </select>
    <select class="shop-filter-select" data-filter="work" aria-label="Filter by work">
      <option value="">All Work Types</option>
      ${opts(works)}
    </select>
    <select class="shop-filter-select" data-filter="availability" aria-label="Filter by availability">
      <option value="">All Availability</option>
      ${opts(avails)}
    </select>
    <button class="shop-filter-clear" id="shop-filter-clear" type="button">&#10005; Clear</button>
  </div>
</div>`;
}

function renderCollectionCards() {
  const seen = new Map();
  for (const p of products) {
    if (!seen.has(p.categorySlug)) {
      seen.set(p.categorySlug, { name: p.category, image: p.images[0] });
    }
  }
  let cards = "";
  for (const [slug, { name, image }] of seen) {
    const count = products.filter(p => p.categorySlug === slug).length;
    const label = escapeHtml(name);
    const imgSrc = escapeHtml(image);
    const slugSafe = escapeHtml(slug);
    cards += `<a class="collection-card" href="collections/${slugSafe}.html">
  <div class="collection-card-image">
    <img src="${imgSrc}" alt="${label}" loading="lazy" />
  </div>
  <div class="collection-card-body">
    <h3 class="collection-card-name">${label}</h3>
    <p class="collection-card-count">${count} ${count === 1 ? "saree" : "sarees"}</p>
  </div>
</a>\n`;
  }
  return `<section id="collections" class="collections-section">
  <div class="collections-inner">
    <h2 class="collections-title">Shop by Collection</h2>
    <p class="collections-sub">Explore our handloom sarees by weave and tradition.</p>
    <div class="collections-grid">
      ${cards.trim()}
    </div>
  </div>
</section>`;
}

function categoryMetaDescription(name, categoryProducts) {
  const count = categoryProducts.length;
  const colours = [...new Set(categoryProducts.map(p => p.colour).filter(v => v && v !== "TBD"))];
  const colourStr = colours.length > 0
    ? ` in ${colours.slice(0, 4).join(", ")}${colours.length > 4 ? " and more" : ""}`
    : "";
  return `Shop ${count} handwoven ${name} saree${count !== 1 ? "s" : ""} from J.S.HANDLOOM${colourStr}. Govt Silk Mark Certified. Enquire directly on WhatsApp.`;
}

function renderCategoryPage(slug, name, categoryProducts) {
  const safeName = escapeHtml(name);
  const safeSlug = escapeHtml(slug);
  const count = categoryProducts.length;
  const cardsHtml = categoryProducts
    .map(p => renderCard(p, { imgPrefix: "../", pdpDir: "../products/" }))
    .join("\n");
  const metaDesc   = escapeHtml(categoryMetaDescription(name, categoryProducts));
  const ogImage    = categoryProducts[0]
    ? `https://swapnadeep2k.github.io/J.S.HANDLOOM/${escapeHtml(categoryProducts[0].images[0])}`
    : "";
  const headerHtml = adjustPathsForSubdir(partials["header"] || "");
  const footerHtml = adjustPathsForSubdir(partials["footer"] || "");
  const widgetHtml = adjustPathsForSubdir(partials["support-widget"] || "");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeName} Sarees - J.S.HANDLOOM</title>
    <meta name="description" content="${metaDesc}" />
    <link rel="canonical" href="https://swapnadeep2k.github.io/J.S.HANDLOOM/collections/${safeSlug}.html" />
    <link rel="icon" href="../images/logo-orange.png" />
    <meta property="og:title" content="${safeName} Sarees - J.S.HANDLOOM" />
    <meta property="og:description" content="${metaDesc}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ""}
    <meta property="og:type" content="website" />
    <link rel="stylesheet" href="../styles/tokens.css" />
    <link rel="stylesheet" href="../styles/general.css" />
    <link rel="stylesheet" href="../styles/header.css" />
    <link rel="stylesheet" href="../styles/footer.css" />
    <link rel="stylesheet" href="../styles/support-widget.css" />
    <link rel="stylesheet" href="../styles/shop.css" />
    <link rel="stylesheet" href="../styles/pdp.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous" />
  </head>
  <body>
    ${headerHtml}

    <nav class="pdp-breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Home</a>
      <span aria-hidden="true">›</span>
      <a href="../shop.html">Shop</a>
      <span aria-hidden="true">›</span>
      <span>${safeName}</span>
    </nav>

    <section class="shop-hero">
      <h1>${safeName}</h1>
      <p>${count} ${count === 1 ? "saree" : "sarees"} in this collection</p>
    </section>

    ${renderFilterBar(categoryProducts, false)}

    <section class="shop-grid" style="max-width:1100px;margin:0 auto;padding:24px 24px 56px;">
      ${cardsHtml}
    </section>
    <p class="shop-empty" id="shop-empty">No sarees match your filters — try adjusting or clearing them.</p>

    ${footerHtml}
    ${widgetHtml}
  </body>
  <script src="../scripts/header.js"></script>
  <script src="../scripts/support-widget.js"></script>
  <script src="../scripts/shop.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js" integrity="sha384-I7E8VVD/ismYTF4hNIPjVp/Zjvgyol6VFvRkX/vR+Vc4jQkC+hVqc2pM8ODewa9r" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js" integrity="sha384-0pUGZvbkm6XF6gxjEnlmuGrJXVbNuzT9qBBavbLwCsOGabYfZo0T0to5eqruptLy" crossorigin="anonymous"></script>
</html>`;
}

function generateCategoryPages() {
  const categoryDir = path.join(DIST, "collections");
  fs.mkdirSync(categoryDir, { recursive: true });
  const seen = new Map();
  for (const p of products) {
    if (!seen.has(p.categorySlug)) seen.set(p.categorySlug, p.category);
  }
  for (const [slug, name] of seen) {
    const categoryProducts = products.filter(p => p.categorySlug === slug);
    const html = renderCategoryPage(slug, name, categoryProducts);
    fs.writeFileSync(path.join(categoryDir, slug + ".html"), html, "utf8");
    console.log("built: collections/" + slug + ".html");
  }
}

function generateProductPages() {
  const productsDir = path.join(DIST, "products");
  fs.mkdirSync(productsDir, { recursive: true });

  // Redirect /products/ to shop page
  fs.writeFileSync(path.join(productsDir, "index.html"),
    `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta http-equiv="refresh" content="0;url=../shop.html" /><title>Redirecting...</title></head><body></body></html>`,
    "utf8"
  );

  for (const product of products) {
    const html = renderPDP(product);
    fs.writeFileSync(path.join(productsDir, product.slug + ".html"), html, "utf8");
    console.log("built: products/" + product.slug + ".html");
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

  generateProductPages();
  generateCategoryPages();

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
