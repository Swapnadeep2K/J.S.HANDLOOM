const test = require("node:test");
const assert = require("node:assert/strict");
const { productSchema, serializeJsonLd } = require("../scripts/product-schema");

const siteUrl = "https://example.com";

function product(overrides = {}) {
  return {
    name: "Ivory Khadi Saree",
    slug: "ivory-khadi-saree",
    description: "Handspun khadi saree",
    images: ["images/khadi.jpg"],
    availability: "Made to Order",
    price: "Price on enquiry",
    ...overrides,
  };
}

test("enquiry pricing omits Offer and unavailable data is not invented", () => {
  const schema = productSchema(product(), siteUrl);

  assert.equal(schema.offers, undefined);
  assert.equal(schema.material, undefined);
  assert.equal(schema.availability, undefined);
});

test("uses explicitly supplied material and omits it when absent", () => {
  assert.equal(productSchema(product({ material: "Cotton" }), siteUrl).material, "Cotton");
  assert.equal(productSchema(product({
    category: "Cotton",
    fabricDetails: "Crafted from pure cotton with a textured weave",
  }), siteUrl).material, undefined);
});

test("numeric prices emit an Offer with safe availability mapping", () => {
  const inStock = productSchema(product({ price: "1250.50", availability: "In Stock" }), siteUrl);
  assert.deepEqual(inStock.offers, {
    "@type": "Offer",
    priceCurrency: "INR",
    price: 1250.5,
    url: `${siteUrl}/products/ivory-khadi-saree`,
    availability: "https://schema.org/InStock",
  });

  const outOfStock = productSchema(product({ price: 1250, availability: "Out of Stock" }), siteUrl);
  assert.equal(outOfStock.offers.availability, "https://schema.org/OutOfStock");

  const madeToOrder = productSchema(product({ price: 1250, availability: "Made to Order" }), siteUrl);
  assert.equal(madeToOrder.offers.availability, "https://schema.org/PreOrder");

  const unknownStatus = productSchema(product({ price: 1250, availability: "Coming Soon" }), siteUrl);
  assert.equal(unknownStatus.offers.availability, undefined);
});

test("JSON-LD serialization preserves quotes, newlines, ampersands, and script safety", () => {
  const value = 'A "woven" saree\nwith cotton & silk </script>';
  const serialized = serializeJsonLd({ description: value });

  assert.deepEqual(JSON.parse(serialized), { description: value });
  assert.equal(serialized.includes("</script>"), false);
  assert.match(serialized, /\\u003c\/script>/);
});

test("only positive finite numeric values or plain decimal strings become prices", () => {
  for (const price of ["", "Price on enquiry", "1,250", "₹1250", "1250-1500", "12abc", 0, -1, Infinity]) {
    assert.equal(productSchema(product({ price }), siteUrl).offers, undefined, String(price));
  }

  assert.equal(productSchema(product({ price: 1250 }), siteUrl).offers.price, 1250);
  assert.equal(productSchema(product({ price: "1250" }), siteUrl).offers.price, 1250);
});
