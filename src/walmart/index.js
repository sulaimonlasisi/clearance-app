// Walmart index - export needed modules and initialize client
const WalmartClient = require('./WalmartClient');
const WalmartProductList = require('./WalmartProductList');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

module.exports = {
  client: new WalmartClient(),
  ProductList: WalmartProductList
}
