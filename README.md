# J.S.HANDLOOM

**Live site:** https://swapnadeep2k.github.io/J.S.HANDLOOM/

J.S.HANDLOOM is a premium handloom saree brand specializing in hand-painted Murshidabad
Silk and Muslin Silk sarees with Resham work, all Govt. Silk Mark Certified. This repo is
the brand's website: a static site built with [Eleventy](https://www.11ty.dev/) and
deployed to GitHub Pages.

## What's on the site

- **Home** (`/`) — hero banner, a saree showcase gallery with a click-to-zoom lightbox,
  an Instagram embed, a "how handloom is made" video, customer testimonials, and a
  featured-products strip pulled from the catalog.
- **Shop** (`/shop/`) — the full saree catalog, grouped by category (Murshidabad Silk,
  Muslin Silk), with a dedicated page per product.
- **Product pages** (`/shop/<slug>/`) — photo gallery (same lightbox as the homepage),
  price, fabric, description, and highlights.
- **About Us** (`/about-us/`) — brand story, stats (clients/showrooms/years), and the
  saree-making process.
- **New Arrivals** (`/new-arrivals/`) — a "next collection is on the loom" teaser page.

There is intentionally **no shopping cart or online payment**. Every product page and
the floating support widget link out to a pre-filled WhatsApp chat instead — this matches
how the brand actually takes orders today.

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

The current catalog uses realistic placeholder products built from the brand's existing
photos and copy. Swap in real inventory (names, prices, descriptions, photos) whenever
it's ready — the site structure doesn't need to change.

## Updating contact info

The WhatsApp number, business email, and social links are centralized in one place:
`src/_data/site.json`. Change them there rather than searching the templates.

## Deployment

Deployment to GitHub Pages is automated via `.github/workflows/deploy.yml`: every push to
`main` builds the site with `npm run build:gh` and publishes `_site/` via GitHub Pages.
The repo's **Settings → Pages → Source** is set to **GitHub Actions**.
