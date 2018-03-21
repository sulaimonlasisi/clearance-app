const AmazonProduct = require('./AmazonProduct');
const fs = require('fs');

/* Class representing a list of amazon items */
class AmazonProductList {

  /*
    productsJSON - json list of amazon products.
    Instance attributes:
      products - list of product objects that correlate with a single UPC each.
  */
  constructor(productsJSON) {
    this.products = this.productsList(productsJSON);
  }

  /* 
    Add additional products to the list.
    productsJSON - JSON containing list of amazon products to add.
  */
  addProductsFromJSON(productsJSON) {
    this.addProducts(this.productsList(productsJSON));
  }

  // Create a list of amazon products.
  productsList(productsJSON) {
    let products = [];
    let amazonProduct;

    if (productsJSON.GetMatchingProductForIdResponse && productsJSON.GetMatchingProductForIdResponse.GetMatchingProductForIdResult) {
      productsJSON.GetMatchingProductForIdResponse.GetMatchingProductForIdResult.forEach(function(product) {
        /*
        It is possible for multiple items to share the same UPC.
        As a result, 'product' could be a single product Object or an Array of many product Objects.
        For now, we will omit scenarios where there are multiple products with the same UPC.
        */
        if (product.Products && !Array.isArray(product.Products.Product)) {
          /* Only add products that have item information and are profitable.
            I think the Amazon API will sometimes return products with no information once the
            request limit for a given time period has been exceeded. This is a catch to 
            ensure the program still completes with no errors.
          */
          if (product.Products.Product && product.Products.Product.AttributeSets) {
            amazonProduct = new AmazonProduct(product.Products.Product, product['A$'].Id);
            if (amazonProduct.isProfitable()) {
              products.push(amazonProduct);
            }
          }
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
