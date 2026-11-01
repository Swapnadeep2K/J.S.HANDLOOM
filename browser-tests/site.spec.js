const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ context }) => {
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      await route.continue();
    } else if (url.hostname === "www.instagram.com" && url.pathname === "/embed.js") {
      await route.fulfill({
        contentType: "application/javascript",
        body: `const frame = document.createElement("iframe");
          frame.className = "instagram-media";
          frame.id = "instagram-embed-0";
          frame.style.cssText = "width:540px;min-width:326px;height:781px";
          document.querySelector(".insta-iframe").append(frame);`,
      });
    } else {
      await route.fulfill({ status: 200, contentType: "text/plain", body: "" });
    }
  });
});

test("generated pages load and remain accessible at each viewport", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/", "/shop", "/collections", "/collections/muslin",
    "/products/yellow-muslin-saree-floral-resham-work", "/about-us", "/shipping", "/returns"]) {
    const response = await page.goto(route);
    expect(response.status(), route).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => {
      const report = await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      return report.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
    });
    expect(violations, route).toEqual([]);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("mobile menu removes closed links from focus and dismisses correctly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.locator("#mobileMenuButton");
  await menu.focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest("#sidebar"))).toBe(false);
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => !!document.activeElement.closest("#sidebar"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
  await menu.click();
  await page.locator('#sidebar a[href="#contact"]').click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#overlay")).not.toBeVisible();
  await expect(page).toHaveURL(/#contact$/);
  await menu.click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#overlay")).not.toBeVisible();
});

test("lightbox opens by keyboard without fetching duplicate JPEGs on initial load", async ({ page }) => {
  const jpegRequests = [];
  page.on("request", request => {
    if (/\/(?:main-saree|side-saree-\d)\.jpg(?:\?|$)/.test(request.url())) jpegRequests.push(request.url());
  });
  await page.goto("/");
  const trigger = page.locator('[data-showcase-slide="0"]');
  await trigger.scrollIntoViewIfNeeded();
  await expect.poll(() => trigger.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(jpegRequests).toEqual([]);
  await trigger.focus();
  await page.keyboard.press("Enter");
  const modal = page.locator("#image-popup-overlay");
  await expect(modal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("loaded Instagram embed is not clipped or overflowing at responsive widths", async ({ page }) => {
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const frame = page.locator("#instagram-embed-0");
    await expect(frame).toHaveAttribute("title", "Instagram post from J.S.HANDLOOM");
    const bounds = await frame.evaluate(el => ({
      frame: el.getBoundingClientRect().toJSON(),
      container: el.parentElement.getBoundingClientRect().toJSON(),
    }));
    expect(bounds.frame.right, `iframe width at ${width}px`).toBeLessThanOrEqual(bounds.container.right + 1);
    expect(bounds.frame.bottom, `iframe clipped at ${width}px`).toBeLessThanOrEqual(bounds.container.bottom + 1);
  }
});

test("filters update and announce results, reset preserves catalog, enquiry links remain intact", async ({ page }) => {
  await page.goto("/shop");
  const cards = page.locator(".shop-card:visible");
  const total = await cards.count();
  expect(total).toBeGreaterThan(0);
  const count = page.locator("#shop-result-count");
  await expect(count).toHaveAttribute("aria-live", "polite");
  for (const key of ["category", "colour", "work", "availability"]) {
    const select = page.locator(`select[data-filter="${key}"]`);
    const value = await select.locator("option").nth(1).getAttribute("value");
    await select.selectOption(value);
    const matching = await cards.evaluateAll((nodes, key) => nodes.map(n => n.getAttribute("data-" + key)), key);
    expect(matching.length).toBeGreaterThan(0);
    expect(matching.every(item => item === value)).toBe(true);
    await expect(count).toHaveText(new RegExp(`^${matching.length} saree`));
    await page.locator("#shop-filter-clear").click();
    await expect(cards).toHaveCount(total);
  }
  await page.locator(".shop-card-view").first().click();
  await expect(page.locator("h1")).toBeVisible();
  const href = await page.locator(".pdp-cta").getAttribute("href");
  const url = new URL(href);
  expect(url.hostname).toBe("api.whatsapp.com");
  expect(url.searchParams.get("phone")).toBeTruthy();
  expect(url.searchParams.get("text")).toBeTruthy();
});

test("product schema contains honest enquiry pricing and parseable JSON", async ({ page }) => {
  await page.goto("/products/ivory-khadi-saree-with-dobby-temple-border");
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = schemas.map(JSON.parse).find(schema => schema["@type"] === "Product");
  expect(product).toBeTruthy();
  expect(product.offers).toBeUndefined();
  expect(product.material).not.toBe("Silk");
});

test("mobile hero stays within the cold-cache loading budget", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "CDP throttling is only available in Chromium.");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addInitScript(() => {
    window.loadingMetrics = { lcp: 0, cls: 0 };
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.loadingMetrics.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.loadingMetrics.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const samples = [];
  for (let run = 0; run < 3; run++) {
    await page.goto("/");
    await page.waitForTimeout(6000);
    const sample = await page.evaluate(() => ({
      ...window.loadingMetrics,
      heroRequests: performance.getEntriesByType("resource")
        .filter(entry => /\/hero-banner\.(webp|jpg)(?:\?|$)/.test(entry.name)).length,
    }));
    expect(sample.lcp).toBeGreaterThan(0);
    expect(sample.heroRequests).toBe(1);
    expect(sample.cls).toBeLessThanOrEqual(0.1);
    samples.push(sample.lcp);
  }
  const median = samples.sort((a, b) => a - b)[1];
  expect(median, `mobile LCP samples: ${samples.join(", ")}ms`).toBeLessThanOrEqual(2500);
});
