const walmart = require('../src/walmart/index');
const AmazonClient = require('../src/amazon/AmazonClient');

function testAmazonProducts() {
  let amazonClient = new AmazonClient();
  
  walmart.client.getSpecialFeedItems()
  .then(function(walmartProducts) {
    // For each walmart product, retrieve the correlating amazon product.
    // Walmart UPCs that are associated with zero or more than one Amazon product will be omitted.
    let items = walmartProducts.products.map(item => item.upc);
    // Amazon allows a maximum of 5 items to be looked up at at time.
    // Refer to idList param at http://docs.developer.amazonservices.com/en_US/products/Products_GetMatchingProductForId.html
    // TODO: Loop through slices of items array and make multiple requests. Will only look at first 5 for now.
    amazonClient.getProductsById(items.slice(0, 5))
    .then(function(amazonProducts) {
      amazonProducts.writeToFile('amazon_items.txt');
    });
  });
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
  specialFeeds.forEach(function(feed) {
    walmart.client.categoryIds.forEach(function(categoryId) {
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
// getPaginatedSpecialFeeds();
