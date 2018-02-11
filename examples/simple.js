const walmart = require('../src/walmart/index');
const AmazonClient = require('../src/amazon/AmazonClient');

function testAmazonProducts() {
  let client = new AmazonClient();
  let testUPCs = ["071662068493", "020335030640", "012502642176"];
  
  client.getProductsById(testUPCs).then(function(productList) {
    console.log('data' + productList);
    productList.writeToFile('amazon_items.txt');
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
      categorySpecialFeeds.push(walmart.client.paginate({
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
  console.time('Special Feeds Performance');
  let specialFeedItems = [];
  let promisesFulfilled = 0
  let promisesWithItems = 0;
  let totalItemsCount;

  // Obtain list of promises for all item requests for every category.
  specialFeedItems.push(walmart.client.clearance());
  specialFeedItems.push(walmart.client.specialBuys());
  specialFeedItems.push(walmart.client.bestSellers());
  specialFeedItems.push(walmart.client.rollbacks());
  specialFeedItems.push(walmart.client.preOrders());

  /*
    Get all promises and only check the ones that were fulfilled    
    because some requests usually fail, we don't want to consider them.
  */
  Promise.all(specialFeedItems.map(function(promise) {
    return promise.reflect();
  })).then(function(inspections) {
    let items = [];  // Saves results of all fulfilled deals
    inspections.forEach(function(inspection) {       
      if (inspection.isFulfilled()) {
        promisesFulfilled += 1;
        if (inspection.value().hasOwnProperty('items')) {
          items.push(...inspection.value().items);
          promisesWithItems += 1; // Feeds that had a deal
        }                    
      }
    })
    totalItemsCount = items.length;
    return new walmart.ProductList(items);
  }).then(function(productList){
      //write to file
      productList.writeToFile('special_feeds_items.txt');
      
      // Book keeping
      console.log("Total Feeds Requested: " + specialFeedItems.length);
      console.log("Feeds successfully returned from API: " + promisesFulfilled);
      console.log("Feeds with Items: " + promisesWithItems);
      console.log("UPC Items Count: " + productList.length());
      console.log("Total Items: " + totalItemsCount);
      console.timeEnd('Special Feeds Performance');
  }).catch(console.error.bind(console));
}

testAmazonProducts();
//getSpecialFeedsItems();
// getPaginatedSpecialFeeds();
