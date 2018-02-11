const fetch = require('isomorphic-fetch');
const Promise = require('bluebird');
const fs = require('fs');

/** Class for handling operations with Walmart's inventory */
class WalmartClient {
  // Public methods

  /*
  Instance Attributes
  apiKey - The Walmart developer api key. Required for authenticating requests.
  categoryIds - Ids Walmart uses to represent store product categories.
  delayTime - Amount of time (ms) to delay in between requests. This can be useful when making
              hundreds of requests since there is a limit to how many can run asynchronously at once.
  */
  constructor() {
    this.apiKey = process.env.WALMART_API_KEY;
    // Walmart category IDs will likely not change often so hard coding these in to avoid an extra api request.
    // Can always call this.getCategoryIds() or this.writeCategoryIdsToFile() to update the list if we think they change.
    this.categoryIds = [
      "1334134", "91083", "5427", "1085666", "3920", "1105910", 
      "5438", "3944", "976759", "1094765", "976760", "4044", "1072864", "1115193", 
      "6197502", "3891", "4096", "4104", "7796869", "1229749", "2637", "5428", "1005862", 
      "5440", "5426", "1085632", "4125", "4171", "2636", "6735581"
    ];
    this.delayTime = 500; // 500ms delay. Can increase this if needed.
  }

  // Retrieve a list of all the Walmart category IDs
  getCategoryIds() {
    let categoryIDs = [];
    this.taxonomy().then(function(result) {
      result.categories.forEach(function(category) {
        categoryIDs.push(category.id);
      });
    });
    return categoryIDs;
  }

  getItem(itemID, terra) {
    if (terra) {
      return this._get(options, "//www.walmart.com/product/terra/" + itemID);
    } else {
      return this._get(options, "//www.walmart.com/product/mobile/api/" + itemID);
    }
  }

  taxonomy(delayIndex=0) {
    return this._get(`http://api.walmartlabs.com/v1/taxonomy?apiKey=${this.apiKey}`);
  }

  getItemByUPC(upcCode) {
    return this._get(options, "//www.walmart.com/product/mobile/api/upc/" + upcCode);
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

  /*
  Retrieve a paginated list of products.
  options - Optional object for filtering search results.
            options.categoryId   - The category ID to search by.
            options.specialOffer - The special feed to search by.
            options.brand        - The brand to search by.
            options.delayIndex   - Index multiplier for determining the amount of time to delay a request execution.
  */
  paginate(options={delayIndex: 0}) {
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
              let cat_info = grand_child.path + ',' + grand_child.id+'\n';
              fs.appendFileSync('subcategory_info.txt', cat_info);
            })
          }
          else {
            let cat_info = child.path + ',' + child.id+'\n';
            fs.appendFileSync('subcategory_info.txt', cat_info);
          }
        })
      }
      else {
        let cat_info = category.name + ' ' + category.id+'\n';
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
      let cat_info = category.name + ',' + category.id+'\n';

      fs.appendFileSync('category_info.txt', cat_info);
    })
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

}

module.exports = WalmartClient;
