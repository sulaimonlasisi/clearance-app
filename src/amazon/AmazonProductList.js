const AmazonProduct = require('./AmazonProduct');
const fs = require('fs');

/* Class representing a list of amazon items */
class AmazonProductList {

  /* productsJSON - json list of amazon products
    Instance attributes:
      products - list of product objects that correlate with a single UPC each.
  */
  constructor(productsJSON) {
    this.products = this.productsList(productsJSON);
  }

  // Create a list of amazon products.
  productsList(productsJSON) {
    let products = [];

    if (productsJSON.GetMatchingProductForIdResponse.GetMatchingProductForIdResult) {
      productsJSON.GetMatchingProductForIdResponse.GetMatchingProductForIdResult.forEach(function(product) {
        /*
        It is possible for multiple items to share the same UPC.
        As a result, 'product' could be a single product Object or an Array of many product Objects.
        For now, we will omit scenarios where there are multiple products with the same UPC.
        */
        if (!Array.isArray(product.Products.Product)) {
          products.push(new AmazonProduct(product.Products.Product)); // Amazon's json structure is a bit weird...
        }
      });
    }
    return products;
  }

  // Merge a list of amazon products with this.products
  addProducts(otherProducts) {
    this.products = this.products.concat(otherProducts);
  }

  // Save all products info to a file.
  writeToFile(fileName) {
    let amazon_items_file = fs.createWriteStream(fileName);
    amazon_items_file.on('error', function(err) { console.log(err) });
    this.products.forEach(function(product) {
      amazon_items_file.write(product.print());
    });
    amazon_items_file.end();
  }

  // If file doesn't exist, create a new one and write products info to it.
  // If file does exist, append products info to the end of it.
  appendToFile(fileName) {
    let productText = '';
    this.products.forEach(function(product){
      productText += product.print();
    });
    fs.appendFile(fileName, productText, (err) => {
        if (err) throw err;
      });
  }

  length() {
    return this.products.length;
  }

}

module.exports = AmazonProductList;
