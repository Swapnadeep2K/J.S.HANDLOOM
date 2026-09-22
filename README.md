# J.S.HANDLOOM

Website for J.S.HANDLOOM, a premium handloom saree brand. Built as a static site with
[Eleventy](https://www.11ty.dev/), deployed to GitHub Pages.

## Requirements

- Node.js 18+ and npm

## Setup

```sh
npm install
```

## Local development

```sh
npm start
```

Starts Eleventy's dev server with live reload at `http://localhost:8080`.

## Building

```sh
npm run build       # production build for a custom domain / root deploy, output in _site/
npm run build:gh    # production build for GitHub Pages project site (adds the /J.S.HANDLOOM/ path prefix)
```

## Project structure

- `src/_data/` — site-wide config (`site.json`: contact info, WhatsApp number, social links) and the product catalog (`products.json`).
- `src/_includes/layouts/` — base page layout and the product-detail layout (adds Product JSON-LD).
- `src/_includes/partials/` — shared header, footer, support widget, image gallery/lightbox, SVG icon macros, and SEO meta/JSON-LD partials.
- `src/css/` — one stylesheet per component; `tokens.css` holds the brand's CSS custom properties (colors, spacing).
- `src/js/` — vanilla JS for the mobile nav, image lightbox, and WhatsApp support widget.
- `src/images/` — source images; processed at build time via `@11ty/eleventy-img` into optimized, responsive variants.
- `src/shop/` — the product catalog listing (`index.njk`) and the per-product detail page template (`product-detail.njk`, generated once per entry in `products.json` via Eleventy pagination).

## Editing the product catalog

Products live in `src/_data/products.json` as a flat array. To add, remove, or edit a saree,
edit that file directly — no template changes needed. Each product needs a unique `slug`
(used in its URL, `/shop/<slug>/`) and references image filenames from `src/images/`.

## Deployment

Deployment to GitHub Pages is automated via `.github/workflows/deploy.yml`: every push to
`main` builds the site with `npm run build:gh` and publishes `_site/` via GitHub Pages.

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
