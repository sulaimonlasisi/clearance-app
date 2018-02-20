const Promise = require('bluebird');
const mwsProd = require('mws-product');
const ProductList = require('./AmazonProductList');

/* Class for handling operations with Amazon's inventory */
class AmazonClient {
  /*
    Instance Attributes:
      accessKey - Amazon API developer key.
      secretKey - Amazon API developer secret.
      sellerId  - Amazon seller account Id.
      app       - Amazon MWS Products service client.
      delayTime - Amount of time (ms) to delay in between requests. This can be useful when making
                  hundreds of requests since there is a limit to how many can run asynchronously at once.
  */
  constructor() {
    this.accessKey = process.env.AMAZON_ACCESS_KEY;
    this.secretKey = process.env.AMAZON_SECRET_KEY;
    this.sellerId  = process.env.AMAZON_SELLER_ID;
    this.app = mwsProd({auth: {sellerId: this.sellerId, accessKeyId: this.accessKey, secretKey: this.secretKey}, marketplace: 'US'});
    this.delayTime = 500; // 500ms delay. Can increase this if needed.
  }

  /*
    Retrieve a list of amazon products by their ID.
    productIds - A structured list of Id values. Used to identify products in the given marketplace.
    idType     - The type of product ID to lookup by. The following ID types are supported:
                 ASIN, GCID, SellerSKU, UPC, EAN, ISBN, and JAN.
  */
  getProductsById(productIds, idType='UPC', delayIndex=0) {
    // Amazon API has throttling and allows 20 requests every 5 seconds = 18,000 requests/hour.
    // Need to implement a delay mechanism to handle bulk operations.
    let productList = new ProductList([]);

    return this._batchedProductsRequest(productIds, idType)
    .then(function(inspections) {
      inspections.forEach(function(inspection) {
        if (inspection.isFulfilled()) {
          if (inspection.value().hasOwnProperty('GetMatchingProductForIdResponse')) {
            productList.addProductsFromJSON(inspection.value());
          }
        }
      });

      return productList;
    }).catch(function(error) {
      console.log(error);
      // Something went wrong. Return an empty products list.
      return new ProductList([]);
    });
  }

  /* Private methods */

  /* 
    Breaks bulk requests into batches of 5 and resolves all returned promises.
    This is necessary because Amazon's API allows a maximum of 5 items to be looked up at at time.
    For details, refer to idList param at http://docs.developer.amazonservices.com/en_US/products/Products_GetMatchingProductForId.html 
  */
  _batchedProductsRequest(productIds, idType, delayIndex=0) {
    let promises = [];
    let index=0;
    let sliceEnd;

    do {
      sliceEnd = sliceEnd > productIds.length ? productIds.length : index + 5;
      promises.push(this._getProductsById(productIds.slice(index, sliceEnd), idType, index/5));
      index+=5;
    } while (index < productIds.length);

    return Promise.all(promises.map(function(promise) {
      return promise.reflect();
    }));
  }

  /* Make a request to Amazon to retrieve 1-5 products by their Ids. */
  _getProductsById(productIds, idType, delayIndex=0) {
    const that = this; // 'this' becomes undefined inside promise so store reference.

    return Promise.delay(delayIndex*this.delayTime).then(function() {
      return new Promise(function (resolve, reject) {
        that.app.matchingProductForId({idType: idType, idList: productIds}, function(err, jsonResponse) {
          !err ? resolve(jsonResponse) : reject(err);
        });
      });
    });
  }
}

module.exports = AmazonClient;
