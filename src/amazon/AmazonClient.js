const fs = require('fs');
const mwsProd = require('mws-product');
const ProductList = require('./AmazonProductList');

/** Class for handling operations with Amazon's inventory */
class AmazonClient {
  /*
    Instance Attributes
    accessKey -
    secretKey -
    sellerId  -
  */
  constructor() {
    this.accessKey = process.env.AMAZON_ACCESS_KEY;
    this.secretKey = process.env.AMAZON_SECRET_KEY;
    this.sellerId  = process.env.AMAZON_SELLER_ID;
    this.app = mwsProd({auth: {sellerId: this.sellerId, accessKeyId: this.accessKey, secretKey: this.secretKey}, marketplace: 'US'});
  }

  /*
    Retrieve a list of amazon products by their ID.
    productIds - A structured list of Id values. Used to identify products in the given marketplace.
    idType     - The type of product ID to lookup by. The following ID types are supported:
                 ASIN, GCID, SellerSKU, UPC, EAN, ISBN, and JAN.
  */
  getProductsById(productIds, idType='UPC') {
    // Amazon API has throttling and allows 20 requests every 5 seconds = 18,000 requests/hour.
    // Need to implement a delay mechanism to handle bulk operations.
    const that = this; // 'this' becomes undefined inside promise so store reference.
    return new Promise(function (resolve, reject) {
      that.app.matchingProductForId({idType: idType, idList: productIds}, function(err, jsonResponse) {
        !err ? resolve(jsonResponse) : reject(err);
      });
    }).then(function(jsonResponse) {
      return new ProductList(jsonResponse);
    })
  }
}

module.exports = AmazonClient;
