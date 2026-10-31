const SITE_URL = "https://swapnadeep2k.github.io/J.S.HANDLOOM";

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
  }
  return result;
}

function latestDate(...values) {
  const dates = values.filter(Boolean).map(value => new Date(value)).filter(date => !Number.isNaN(date.getTime()));
  return dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))).toISOString().slice(0, 10) : undefined;
}

function generateSitemap({ pages, products, lastModified }) {
  const entries = [];
  for (const { file, html } of pages) {
    const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]));
    if (meta.some(tag =>
      (["robots", "googlebot"].includes((tag.name || "").toLowerCase()) && /\b(noindex|none)\b/i.test(tag.content || "")) ||
      (tag["http-equiv"] || "").toLowerCase() === "refresh"
    )) continue;

    const loc = file === "index.html" ? "/" : "/" + file.replace(/\.html$/, "");
    const catalogPage = /<!--#(?:products|collections|category-filters|filter-bar)\b/.test(html);
    const dependencies = [file, "scripts/build.js"];
    if (/<!--#include\b/.test(html)) dependencies.push("partials");
    if (catalogPage) dependencies.push("data/products.json");
    entries.push({
      loc,
      lastmod: latestDate(lastModified(dependencies), ...(catalogPage ? products.map(p => p.updatedAt) : [])),
      changefreq: file === "index.html" || catalogPage ? "weekly" : "monthly",
      priority: file === "index.html" ? "1.0" : catalogPage ? "0.9" : ["shipping.html", "returns.html"].includes(file) ? "0.6" : "0.8",
    });
  }

  const templateDate = lastModified(["scripts/build.js", "partials"]);
  const productDate = product => latestDate(product.updatedAt) || lastModified(["data/products.json"]);
  const categories = [...new Set(products.map(product => product.categorySlug))];
  for (const slug of categories) {
    entries.push({
      loc: "/collections/" + slug,
      lastmod: latestDate(templateDate, ...products.filter(p => p.categorySlug === slug).map(productDate)),
      changefreq: "weekly",
      priority: "0.8",
    });
  }
  for (const product of products) {
    entries.push({
      loc: "/products/" + product.slug,
      lastmod: latestDate(templateDate, productDate(product)),
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  const escapeXml = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(entry => `  <url>
    <loc>${escapeXml(SITE_URL + entry.loc)}</loc>
${entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>\n` : ""}    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>
`).join("") + '</urlset>\n';
}

module.exports = { generateSitemap };
