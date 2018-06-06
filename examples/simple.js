const walmart = require('../src/walmart/index');
const AmazonClient = require('../src/amazon/AmazonClient');
const AnalysisClient = require('../src/analysis/AnalysisClient');
const PairedProductList = require('../src/PairedProductList');
const RatingsClient = require('../src/ratings/RatingsClient');

//get input parameters specified by user
let analysisObj = {
  minROI: process.argv[2],
  minRatings: process.argv[3],
  minNumReviews: process.argv[4]
}

function testAmazonProducts() {
  let amazonClient = new AmazonClient();
  let analysisClient = new AnalysisClient(analysisObj);
  walmart.client.getSpecialFeedItems().then(function(walmartProducts) {
    return walmartProducts;
  }).then(function (walmartProducts) {
    console.log(`Returned Walmart Products Count After Filtering UPC and Availability: ${walmartProducts.products.length}`)
    return amazonClient.getPairedProducts(walmartProducts.products);
  }).then(function (pairedProducts) {
    console.log(`Returned Amazon ProductsById Count: ${pairedProducts.products.length}`);
    //simple cost analysis eliminates items with lower than intended %ROI from further AMZN/WLMRT calls
    let profitablePairedProductsList = analysisClient.getSimpleCostAnalysis(pairedProducts);
    console.log(`Returned Products Count After Simple Cost Analysis: ${profitablePairedProductsList.products.length}`);
    //A lot of items have been filtered out, we can get real-time price from WLMRT for remaining
    let itemsIdList = profitablePairedProductsList.products.map(item => item.walmartProd.itemId);
    return {
      idList: itemsIdList,
      pairedProducts: profitablePairedProductsList
    };
  }).then(function (idListAndPairedProdListObj) {
    return walmart.client.getProductsByItemId(idListAndPairedProdListObj.idList).then(function (realTimeItemsList) {
      console.log(`Returned Products Count After Walmart Product Lookup: ${realTimeItemsList.products.length}`);
      //Update pairedProducts to only include items returned from Walmart Product Lookup
      //It is possible an item that was in PairedProducts before is no longer returned by walmart 
      //because current availability is not in stock even though special feeds said it was available
      let realTimePairedProducts = new PairedProductList();
      realTimeItemsList.products.forEach(function(realTimeWalmartProduct) {
        realTimePairedProducts.addPairedProduct(idListAndPairedProdListObj.pairedProducts.products.find(item => item.walmartProd.upc == realTimeWalmartProduct.upc).amazonProd, realTimeWalmartProduct);
      });          
      return realTimePairedProducts;
    })
  }).then(function (pairedProducts) {
    amazonClient.getLowestOfferListingsByASIN(pairedProducts).then(function(lowestOfferPairedProducts) {
      console.log(`Returned Products Count After LowestOfferListings Lookup: ${lowestOfferPairedProducts.products.length}`);
      //secondary cost analysis eliminates items with lower than intended %ROI from list
      return analysisClient.getSecondaryAnalysis(lowestOfferPairedProducts);      
    }).then(function (profitablePairedProductsList){
      let ratingsClient = new RatingsClient();
      console.log(`Returned Products Count After Secondary Cost Analysis: ${profitablePairedProductsList.products.length}`);
      if (profitablePairedProductsList.products.length > 0) {
        ratingsClient.getAllItemsRatingsAndReviews(profitablePairedProductsList).then((allRev) => {
          let preferredAndPopularPairedProductsList = analysisClient.getPreferredAndPopularItems(allRev);
          console.log(`Returned Products Count After Ratings and Review Analysis: ${preferredAndPopularPairedProductsList.products.length}`);
          preferredAndPopularPairedProductsList.writeToFile('paired_items.tsv');
        })
      }
      else {
        console.log("No items to analyze ratings and reviews for");
      }      
    })        
  })
}




function getRecursiveResponse(response, idx){
  let resultsArray;
  if (response != undefined && response.hasOwnProperty('items')){
    resultsArray = new walmart.ProductList(response.items);
  /*
    It is a good idea to limit the depth of the recursion for the following reasons:
       1) Walmart limits the number of requests allowed.
       2) Recursive functions are very slow and memory intensive.
    Modify the 'idx < 2' conditional to control the recursion depth as desired.
    Lower limits will yield less results but run much quicker.
  */
    if (response.nextPage && idx < 50) {
      walmart.client.getNewPage(response.nextPage, idx).then(function(resp){
        resultsArray.addProducts(getRecursiveResponse(resp, (idx+1)));
      })      
    }

    resultsArray.appendToFile('paginated_special_feeds_items.txt');
    
    return;
  }
}

function getPaginatedSpecialFeeds(){
  /*
    Goes through all valid feed/category combinations and returns Promises of getSingleListOfPaginatedItems
  */
  let specialFeeds = ["clearance", "specialbuy", "bestsellers"];
  let categorySpecialFeeds = [];
  let paginateDelayIndex = 0;

  // Retrieve deal information for each category
  walmart.client.getCategoryIds().then(function(categoryIds) {
    specialFeeds.forEach(function(feed) {
      categoryIds.forEach(function(categoryId) {
        categorySpecialFeeds.push(walmart.client.getPaginatedItems({
          categoryId: categoryId,
          specialOffer: feed,
          delayIndex: paginateDelayIndex
        }));
        paginateDelayIndex += 1;
      });
    });

    // Get pages from fulfilled promises
    Promise.all(categorySpecialFeeds.map(function(promise) {
      return promise.reflect();
    })).then(function(inspections) {
      inspections.forEach(function(inspection, index) {       
        if (inspection.isFulfilled()) {
          getRecursiveResponse(inspection.value(), index)                  
        }
      })
    }).catch(console.error.bind(console))
  });
}

function getSpecialFeedsItems() {
  console.time('Special Feeds Performance'); // Performance test

  walmart.client.getSpecialFeedItems()
  .then(function(walmartProducts) {
    //write to file
    walmartProducts.writeToFile('special_feeds_items.txt');

    // Book keeping
    console.log("UPC Items Count: " + walmartProducts.length());
    console.timeEnd('Special Feeds Performance');
  });
}
testAmazonProducts();
//getSpecialFeedsItems();
//getPaginatedSpecialFeeds();
