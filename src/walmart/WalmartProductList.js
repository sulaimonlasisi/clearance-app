const WalmartProduct = require('./WalmartProduct');
const fs = require('fs');

/* Class representing a list of walmart items */
class WalmartProductList {

  /* productsJSON - json list of walmart products
    Instance attributes:
  constructor(productsJSON) {
    this.products = this.productsList(productsJSON);
  }
      products - list of product objects with UPCs.
  */

  // Create a list of walmart products that all have a UPC code.
  productsList(productsJSON) {
    let products = [];

    productsJSON.forEach(function(product) {
      if (product.hasOwnProperty('upc') && product.availableOnline) {
        products.push(new WalmartProduct(product));
      }
    });
    return products;
  }

  // Merge a list of walmart products with this.products
  addProducts(otherProducts) {
    this.products = this.products.concat(otherProducts);
  }

  // Save all products info to a file.
  writeToFile(fileName) {
    let special_feeds_file = fs.createWriteStream(fileName);
    special_feeds_file.on('error', function(err) { console.log(err) });
    this.products.forEach(function(product) {
      special_feeds_file.write(product.print());
    });
    special_feeds_file.end();
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

module.exports = WalmartProductList;
