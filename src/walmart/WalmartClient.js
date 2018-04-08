const fetch = require('isomorphic-fetch');
const Promise = require('bluebird');
const fs = require('fs');
const ProductList = require('./WalmartProductList');

/** Class for handling operations with Walmart's inventory */
class WalmartClient {
  // Public methods

  /*
  Instance Attributes:
    apiKey    - The Walmart developer api key. Required for authenticating requests.
    delayTime - Amount of time (ms) to delay in between requests. This can be useful when making
                hundreds of requests since there is a limit to how many can run asynchronously at once.
  */
  constructor() {
    this.apiKey = process.env.WALMART_API_KEY;
    this.delayTime = 500; // 500ms delay. Can increase this if needed.
  }

  // Retrieve a list of all the Walmart category IDs
  getCategoryIds() {
    let categoryIDs = [];
    const that = this;

    return new Promise(function(resolve, reject) {
      that.taxonomy().then(function(result) {
        result.categories.forEach(function(category) {
          categoryIDs.push(category.id);
        });
        resolve(categoryIDs);
      });
    }).then(function(categoryIDs) {
      return categoryIDs;
    }).catch(function(err) {
      reject(err);
    });
  }


  getItem(itemID, terra) {
    if (terra) {
      return this._get(options, "//www.walmart.com/product/terra/" + itemID);
    } else {
      return this._get(options, "//www.walmart.com/product/mobile/api/" + itemID);
    }
  }

  getItemByUPC(upcCode) { 
    return this._get(options, "//www.walmart.com/product/mobile/api/upc/" + upcCode);  
  }

  taxonomy(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/taxonomy?apiKey=${this.apiKey}`);
  }

  // The items method requires additional permissions to use.
  items(categoryId, delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/feeds/items?apiKey=${this.apiKey}&categoryId=${categoryId}`, delayIndex*this.delayTime);
  }

  // Special Feeds Requests.
  // Note: Could also make these specific to categories by appending '&categoryId=<categoryId>' to endpoint.
  bestSellers(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/feeds/bestsellers?apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }

  preOrders(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/feeds/preorder?apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }

  rollbacks(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/feeds/rollback?apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }

  clearance(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/feeds/clearance?apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }

  specialBuys(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/feeds/specialbuy?apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }

  valueOfTheDay(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/vod?apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }

  trending(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/trends?apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }

  search(query='ZZZ', delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/search?apiKey=${this.apiKey}&query=${query}`, delayIndex*this.delayTime);
  }

  getSpecialFeedItems() {
    return this._getAllSpecialFeedItems()
    .then(function(inspections) {
      /*
        Get all promises and only check the ones that were fulfilled    
        because some requests usually fail, we don't want to consider them.
      */
      let isFulfilledCount = inspections.filter(function(s) { return s.isFulfilled(); }).length;
      console.log(`Walmart SpecialFeeds Promises Requested: ${inspections.length}, Walmart SpecialFeeds Promises Fulfilled: ${isFulfilledCount}`)
      let items = [];  // Saves results of all fulfilled deals
      inspections.forEach(function(inspection, index) {       
        if (inspection.isFulfilled()) {
          if (inspection.value().hasOwnProperty('items')) {
            console.log(`Promise ${index} count: ${inspection.value().items.length}`)
            items.push(...inspection.value().items);
          }                    
        }
      });

      return new ProductList(items);
    }).catch(function(error) {
      console.log(error);
      // Something went wrong. Return an empty products list.
      return new ProductList([]);
    });
  }

  /*
  Retrieve a paginated list of products.
  options - Optional object for filtering search results.
            options.categoryId   - The category ID to search by.
            options.specialOffer - The special feed to search by.
            options.brand        - The brand to search by.
            options.delayIndex   - Index multiplier for determining the amount of time to delay a request execution.
  */
  getPaginatedItems(options={delayIndex: 0}) {
    let url = `http://api.walmartlabs.com/v1/paginated/items?apiKey=${this.apiKey}`;
    if (options.categoryId) {
      url += `&category=${options.categoryId}`;
    }
    if (options.specialOffer) {
      url += `&specialOffer=${options.specialOffer}`;
    }
    if (options.brand) {
      url += `&brand=${options.brand}`;
    }

    return this._get(url, options.delayIndex*this.delayTime);
  }

  getNewPage(nextPage, delayIndex=0) {
    const that = this; // 'this' becomes undefined inside promise so store reference.
    return Promise.delay(delayIndex*this.delayTime).then(function() {
      return that._get(`http://api.walmartlabs.com${nextPage}`, delayIndex*that.delayTime);
    });
  }

  writeSubCategoryIdsToFile(){
    /*
      paths are are separated by "/" between categories. max of 3 categories possible.
      ids are separated by "_" between categories. max of 3 categories possible.
      may not need info up to the lowest level but if we do need it for description, this
      function will generate the classification tree

      writes to file in format: upper_category/middle_category/lowest_category,upper-id_middle-id_lowest_id
    */
    this.taxonomy().then(function(data){
      data.categories.forEach(function(category){
        if (category.hasOwnProperty('children')){
          category.children.forEach(function(child){
            if (child.hasOwnProperty('children')){
              child.children.forEach(function(grand_child){
                let cat_info = grand_child.path + "," + grand_child.id + "\r\n";
                fs.appendFileSync('subcategory_info.txt', cat_info);
              })
            }
            else {
              let cat_info = child.path + "," + child.id + "\r\n";
              fs.appendFileSync('subcategory_info.txt', cat_info);
            }
          })
        }
        else {
          let cat_info = category.name + " " + category.id + "\r\n";
          fs.appendFileSync('subcategory_info.txt', cat_info);
        }
      })
    });
  }

  writeCategoryIdsToFile(){
    /*
      writes category id and names to file
    */
    this.taxonomy().then(function(data){
      data.categories.forEach(function(category){
        let cat_info = category.name + "," + category.id + "\r\n";

        fs.appendFileSync('category_info.txt', cat_info);
      })
    });
  }

  getProductsByItemId(itemIdsList) {
    /*
    Get real time walmart item using itemId.
    */
    let itemsList = [];
    return this._batchedWalmartItemRequest(itemIdsList)
    .then(function(inspections) {
      inspections.forEach(function(inspection) {
        if (inspection.isFulfilled()) {
          itemsList.push(...inspection.value().items)
        }
      });
      return new ProductList(itemsList);
    }).catch(function(error) {
      console.log(error);
      // Something went wrong. Return an empty products list.
      return [];
    });
  }

  // Private methods

  /*
  Make a GET request to the Walmart API.
  url  - The api endpoint the request is being made to.
  time - The amount of milliseconds to delay the promise execution.
  */
  _get(url, time=0) {
    return Promise.delay(time).then(function() {
      return new Promise(function (resolve, reject) {
        fetch(url)
        .then(function(response) {
          if (response.status >= 400) {
            throw new Error("Bad server response");
          }
          resolve(response.json());
        }).catch(function(err) {
          reject(err);
        });
      });
    });
  }

  // Returns an array of Promises for retrieving information for all special feeds and all categories.
  _getAllSpecialFeedItems() {
    let specialFeedItems = [];

    // Obtain list of promises for all item requests for every category.
    specialFeedItems.push(this.clearance());
    specialFeedItems.push(this.specialBuys());
    specialFeedItems.push(this.bestSellers());
    specialFeedItems.push(this.rollbacks());
    specialFeedItems.push(this.preOrders());

    // Return promises
    return Promise.all(specialFeedItems.map(function(promise) {
      return promise.reflect();
    }));
  }
  

  //Batches ItemId request. Takes up to 20 item Ids at a time
  _batchedWalmartItemRequest(itemIdsList) {
    let promises = [];
    let index = 0;
    let sliceEnd;
    let incrementValue=20;
    do {
      sliceEnd = sliceEnd > itemIdsList.length ? itemIdsList.length : index + incrementValue;
      promises.push(this._getItemByItemId(itemIdsList.slice(index, sliceEnd), index/incrementValue));
      index+=incrementValue;
    } while (index < itemIdsList.length);

    return Promise.all(promises.map(function(promise) {
      return promise.reflect();
    }));
  }

  _getItemByItemId(itemIdsList, delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/items?ids=${itemIdsList.join(',')}&apiKey=${this.apiKey}`, delayIndex*this.delayTime);
  }
}





module.exports = WalmartClient;
