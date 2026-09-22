const eleventyImage = require("@11ty/eleventy-img");
const htmlmin = require("html-minifier-terser");

module.exports = function (eleventyConfig) {
  // eleventy-img generates absolute URLs unaware of Eleventy's pathPrefix,
  // so the prefix must be folded into urlPath by hand for every shortcode below.
  const pathPrefix = process.env.PATH_PREFIX || "/";
  const imagesUrlPath = (pathPrefix.endsWith("/") ? pathPrefix : pathPrefix + "/") + "images/optimized/";

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy({ "src/images/favicon": "/" });

  eleventyConfig.addFilter("whatsappLink", function (message, phone) {
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent("+" + phone)}&text=${encodeURIComponent(message)}`;
  });

  eleventyConfig.addShortcode("currentYear", () => `${new Date().getFullYear()}`);

  eleventyConfig.addFilter("currency", function (amount, currency) {
    const symbol = currency === "INR" ? "₹" : "";
    return `${symbol}${Number(amount).toLocaleString("en-IN")}`;
  });

  // One plain <img> per photo, in DOM order, carrying data-showcase-slide —
  // required by src/js/image-popup.js's lightbox, which cannot handle <picture>.
  eleventyConfig.addNunjucksAsyncShortcode(
    "galleryImg",
    async function (src, alt, cssClass, slideIndex) {
      const metadata = await eleventyImage(`./src/images/${src}`, {
        widths: [800],
        formats: ["jpeg"],
        outputDir: "./_site/images/optimized/",
        urlPath: imagesUrlPath,
      });
      const img = metadata.jpeg[0];
      const loading = slideIndex === 0 ? "eager" : "lazy";
      return `<img src="${img.url}" width="${img.width}" height="${img.height}" alt="${alt}" class="${cssClass}" data-showcase-slide="${slideIndex}" loading="${loading}">`;
    }
  );

  // Full responsive <picture> output for images with no lightbox contract to preserve.
  eleventyConfig.addNunjucksAsyncShortcode(
    "responsiveImg",
    async function (src, alt, cssClass, sizesAttr, widths, formats) {
      const metadata = await eleventyImage(`./src/images/${src}`, {
        widths: widths || [400, 800, 1200],
        formats: formats || ["webp", "jpeg"],
        outputDir: "./_site/images/optimized/",
        urlPath: imagesUrlPath,
      });
      return eleventyImage.generateHTML(metadata, {
        alt,
        class: cssClass,
        sizes: sizesAttr || "100vw",
        loading: "lazy",
        decoding: "async",
      });
    }
  );

  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (
      process.env.ELEVENTY_ENV === "production" &&
      outputPath &&
      outputPath.endsWith(".html")
    ) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }
    return content;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
};
