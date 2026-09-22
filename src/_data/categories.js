const products = require("./products.json");

module.exports = () => [...new Set(products.map((p) => p.category))];
