const Promise = require('bluebird');
const mwsProd = require('mws-product');
const ProductList = require('./AmazonProductList');
const PairedProductList = require('./../PairedProductList');
const AnalysisClient = require('../analysis/AnalysisClient');

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
    this.delayTime = 1200; // 1.2s delay. Restore rates we are dealing with are per second
    this.analysisClient = new AnalysisClient();
  }

  /*
    Optional wrapper function around getProductsById. Use this function for returning an array
    of amazon products along with their correlating walmart products.
    Return: [{amazonProd: AmazonProduct, walmartProd: WalmartProduct}]
  */
  getPairedProducts(walmartProducts, idType='UPC', delayIndex=0) {
    let pairedProducts = new PairedProductList();
    let that = this;
    return this.getProductsById(walmartProducts.map(item => item.upc), idType, delayIndex)
    .then(function(amazonProducts) {
      amazonProducts.products.forEach(function(amazonProduct) {
        pairedProducts.addPairedProduct(amazonProduct, walmartProducts.find(item => item.upc == amazonProduct.upc));
      });
      return pairedProducts;
    }).catch(function(error) {
      console.log(error);
      // Something went wrong. Return an empty list.
      return [];
    });
  }

  /*
    Retrieve a list of amazon products by their ID.
    productIds - A structured list of Id values. Used to identify products in the given marketplace.
    idType     - The type of product ID to lookup by. The following ID types are supported:
                 ASIN, GCID, SellerSKU, UPC, EAN, ISBN, and JAN.
  */
  getProductsById(productIds, idType='UPC') {
    // Amazon API has throttling and allows 20 max requests
    //then it throttles at 5 items requested per second
    // Need to implement a delay mechanism to handle bulk operations.
    let productList = new ProductList([]);
    return this._batchedProductsRequest(productIds, idType)
    .then(function(inspections) {
      let isFulfilledCount = inspections.filter(function(s) { return s.isFulfilled(); }).length;
      console.log(`Amazon getProductsById Promises Requested: ${inspections.length}, Amazon getProductsById Promises Fulfilled: ${isFulfilledCount}`)
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
  
  /*
    Gets lowest offer information for each item and returns all that 
  */
  getLowestOfferListingsByASIN(realTimeItemsList, asinList) {
    let lowestOfferListings = [];
    let lowestOfferPairedProducts = new PairedProductList();
    return this._batchedLowestOfferListingsRequest(asinList)
    .then(function(inspections) {
      let isFulfilledCount = inspections.filter(function(s) { return s.isFulfilled(); }).length;
      console.log(`LowestOfferListings Promises Requested: ${inspections.length}, LowestOfferListings Promises Fulfilled: ${isFulfilledCount}`)
      inspections.forEach(function(inspection) {
        if (inspection.isFulfilled()) {
          if (inspection.value().hasOwnProperty('GetLowestOfferListingsForASINResponse')) {
            inspection.value().GetLowestOfferListingsForASINResponse.GetLowestOfferListingsForASINResult.forEach(function(lowestOfferInfo){
              lowestOfferListings.push(lowestOfferInfo)
            })
          }
        }
      });      
      //filter listing information to match pairedProducts to be used going forward
      lowestOfferListings.forEach(function (lowestOfferInfo) {
        let matchedPairedProduct = realTimeItemsList.products.find(matchedProduct => matchedProduct.amazonProd.ASIN == lowestOfferInfo.A$.ASIN);
        matchedPairedProduct.amazonProd.setLowestOfferInformation(lowestOfferInfo);
        lowestOfferPairedProducts.addPairedProduct(matchedPairedProduct.amazonProd, matchedPairedProduct.walmartProd);
      })
      return lowestOfferPairedProducts;
    }).catch(function(error) {
      console.log(error);
      // Something went wrong. Return an empty list.
      return new PairedProductList();
    });
  }

  /* Private methods */

  /* 
    Breaks bulk requests into batches of 5 and resolves all returned promises.
    This is necessary because Amazon's API allows a maximum of 5 items to be looked up at at time.
    For details, refer to idList param at http://docs.developer.amazonservices.com/en_US/products/Products_GetMatchingProductForId.html 
  */
  _batchedProductsRequest(productIds, idType) {
    let promises = [];
    let index=0;
    let sliceEnd;
    let incrementValue=5;
    do {
      sliceEnd = sliceEnd > productIds.length ? productIds.length : index + incrementValue;
      promises.push(this._getProductsById(productIds.slice(index, sliceEnd), idType, index/incrementValue));
      index+=incrementValue;
    } while (index < productIds.length);
    return Promise.all(promises.map(function(promise) {
      return promise.reflect();
    }));
  }

   /*
    Batches lowest offer requests
   */
  _batchedLowestOfferListingsRequest(asinList) {
    let promises = [];
    let index=0;
    let sliceEnd;
    let incrementValue=10;
    let itemCondition = 'New';
    let excludeMe = true;
    do {
      sliceEnd = sliceEnd > asinList.length ? asinList.length : index + incrementValue;
      promises.push(this._getLowestOfferListingsByASIN(asinList.slice(index, sliceEnd), itemCondition, excludeMe, index/incrementValue));
      index+=incrementValue;
    } while (index < asinList.length);
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

  /*
    Make a request to Amazon to retrieve the lowest offer listings for 1-10 products by their ASIN.
  */
  _getLowestOfferListingsByASIN(asinList, itemCondition, excludeMe, delayIndex=0) {
    const that = this; 
    return Promise.delay(delayIndex*this.delayTime).then(function() {
      return new Promise(function (resolve, reject) {
        that.app.lowestOfferListingsForASIN({asinList: asinList, itemCondition: itemCondition, excludeMe: excludeMe}, function(err, jsonResponse) {
          !err ? resolve(jsonResponse) : reject(err);
        });
      });
    });
  }
}

module.exports = AmazonClient;
