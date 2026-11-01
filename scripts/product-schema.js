function productSchema(product, siteUrl) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `${siteUrl}/${product.images[0]}`,
  };

  if (product.colour) schema.color = product.colour;
  if (typeof product.material === "string" && product.material.trim()) {
    schema.material = product.material.trim();
  }

  const price = numericPrice(product.price);
  if (price !== null) {
    const offer = {
      "@type": "Offer",
      priceCurrency: "INR",
      price,
      url: `${siteUrl}/products/${product.slug}`,
    };
    const availability = schemaAvailability(product.availability);
    if (availability) offer.availability = `https://schema.org/${availability}`;
    schema.offers = offer;
  }

  return schema;
}

function numericPrice(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    return null;
  }

  const price = Number(value.trim());
  return Number.isFinite(price) && price > 0 ? price : null;
}

function schemaAvailability(value) {
  if (typeof value !== "string") return null;

  switch (value.trim().toLowerCase()) {
    case "in stock":
      return "InStock";
    case "out of stock":
      return "OutOfStock";
    case "made to order":
      return "PreOrder";
    default:
      return null;
  }
}

function serializeJsonLd(schema) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

module.exports = { productSchema, serializeJsonLd };
