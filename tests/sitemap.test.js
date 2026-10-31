const test = require("node:test");
const assert = require("node:assert/strict");
const { generateSitemap } = require("../scripts/sitemap");

test("discovers new pages while excluding noindex and redirect pages", () => {
  const xml = generateSitemap({
    pages: [
      { file: "index.html", html: "" },
      { file: "new-page.html", html: "" },
      { file: "404.html", html: '<meta content="noindex" name="robots">' },
      { file: "coming-soon.html", html: "<meta NAME='ROBOTS' CONTENT='nofollow, noindex'>" },
      { file: "hidden.html", html: '<meta name=googlebot content=none>' },
      { file: "redirect.html", html: '<meta content="0;url=shop" http-equiv="refresh">' },
    ],
    products: [],
    lastModified: () => "2026-09-01T10:00:00Z",
  });
  assert.match(xml, /J\.S\.HANDLOOM\/<\/loc>/);
  assert.match(xml, /J\.S\.HANDLOOM\/new-page<\/loc>/);
  assert.doesNotMatch(xml, /404|coming-soon|hidden|redirect/);
  assert.equal((xml.match(/<lastmod>2026-09-01<\/lastmod>/g) || []).length, 2);
});

test("uses product and dependency dates without changing dates on rebuild", () => {
  const dependencies = [];
  const input = {
    pages: [
      { file: "shop.html", html: "<!--#include header--><!--#products-->" },
      { file: "about-us.html", html: "<!--#include header-->" },
    ],
    products: [
      { slug: "first", categorySlug: "cotton", updatedAt: "2026-09-10T12:00:00Z" },
      { slug: "second", categorySlug: "cotton", updatedAt: "2026-09-20T12:00:00Z" },
    ],
    lastModified: files => {
      dependencies.push(files);
      return files.includes("about-us.html") ? "2026-09-22T00:00:00Z" : "2026-09-15T00:00:00Z";
    },
  };
  const xml = generateSitemap(input);
  assert.match(xml, /\/shop<\/loc>\s*<lastmod>2026-09-20/);
  assert.match(xml, /\/about-us<\/loc>\s*<lastmod>2026-09-22/);
  assert.match(xml, /\/collections\/cotton<\/loc>\s*<lastmod>2026-09-20/);
  assert.match(xml, /\/products\/first<\/loc>\s*<lastmod>2026-09-15/);
  assert.match(xml, /\/products\/second<\/loc>\s*<lastmod>2026-09-20/);
  assert.equal((xml.match(/\/collections\/cotton<\/loc>/g) || []).length, 1);
  assert.deepEqual(dependencies[0], ["shop.html", "scripts/build.js", "partials", "data/products.json"]);
  assert.equal(generateSitemap(input), xml);
});

test("omits unknown dates and escapes URL values", () => {
  const xml = generateSitemap({
    pages: [],
    products: [{ slug: "a&b", categorySlug: "silk", updatedAt: "invalid" }],
    lastModified: () => undefined,
  });
  assert.doesNotMatch(xml, /lastmod|Invalid Date/);
  assert.match(xml, /\/products\/a&amp;b<\/loc>/);
});
