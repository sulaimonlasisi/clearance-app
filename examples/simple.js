fs = require('fs');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

var walmart = require('../index_for_pagination.js')(process.env.WALMART_API_KEY, {protocol: 'http'});

function writeSubCategoryIdsToFile(){
  /*
    paths are are separated by "/" between categories. max of 3 categories possible.
    ids are separated by "_" between categories. max of 3 categories possible.
    may not need info up to the lowest level but if we do need it for description, this
    function will generate the classification tree

    writes to file in format: upper_category/middle_category/lowest_category,upper-id_middle-id_lowest_id
  */
  walmart.taxonomy().then(function(data){
    data.categories.forEach(function(category){
      if (category.hasOwnProperty('children')){
        category.children.forEach(function(child){
          if (child.hasOwnProperty('children')){
            child.children.forEach(function(grand_child){
              var cat_info = grand_child.path + ',' + grand_child.id+'\n';
              fs.appendFileSync('subcategory_info.txt', cat_info);
            })
          }
          else {
            var cat_info = child.path + ',' + child.id+'\n';
            fs.appendFileSync('subcategory_info.txt', cat_info);
          }
        })
      }
      else {
        var cat_info = category.name + ' ' + category.id+'\n';
        fs.appendFileSync('subcategory_info.txt', cat_info);
      }
    })
  });
}


function writeCategoryIdsToFile(){
  /*
    writes category id and names to file
  */
  walmart.taxonomy().then(function(data){
    data.categories.forEach(function(category){
      var cat_info = category.name + ',' + category.id+'\n';

      fs.appendFileSync('category_info.txt', cat_info);
    })
  });
}

function writeCategoryIdsOnlyToFile(){
  /*
    writes category ids that can be used to get clearance information
    should be called once in a given period since category_ids rarely change daily
  */
  walmart.taxonomy().then(function(data){
    data.categories.forEach(function(category){
      var cat_info = category.id+'\n';
      fs.appendFileSync('category_ids.txt', cat_info);
    })
  });
}

function extractProductInfo(product){
  var twoThreeDayShippingRate = Object.is(product.twoThreeDayShippingRate, undefined) ? '-1.00' : product.twoThreeDayShippingRate; 
  var msrp = Object.is(product.msrp, undefined) ? '-1.00' : product.msrp;
  var product_info=product.itemId+','+product.upc+','+product.name+','+product.brandName+','
    +msrp+','+product.salePrice+','+product.standardShipRate+','
    +twoThreeDayShippingRate+','+product.availableOnline+','+product.categoryNode
    +','+product.stock+','+product.freeShippingOver50Dollars+'\n';
  return product_info;
}


function getRecursiveResponse(response){
  var results_array = [];
  if (response != undefined && response.hasOwnProperty('items')){
    response.items.forEach(function(item){
      // uses upc for identification
      if (item.hasOwnProperty('upc')){
        results_array.push(extractProductInfo(item));
      }
    })
    if (response.nextPage) {
      var new_page_response = walmart.getNewPage(response.nextPage);
      new_page_response.then(function(resp){
        results_array = results_array.concat(results_array, getRecursiveResponse(resp));
      })      
    }
    results_array.forEach(function(item){
      fs.appendFile('special_feeds_items.txt', item, (err) => {
        if (err) throw err;
      });
    })
    
    return;
  }
}


/*
function that serially calls Promise functions and waits for each of them to be resolved
Reference: https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
*/
const promiseSerial = cat_array =>
cat_array.reduce((promise, func) =>
promise.then(result => func().then(Array.prototype.concat.bind(result))),
Promise.resolve([]))


function getSpecialFeedsItems(){
  /*
    Gets clearance items available in all categories.
  */
  
  /*
    after testing for a while, found that feed info for some category_ids return server errors
    So, omitting them from the category_array we are getting feeds info for.
    Run writeCategoryIdsToFile() if interested in the names of the categories
  */

  var invalid_clearance_cat_id_array = ["3920", "976759", "1094765", "6197502", "6197502", "4096", "4104", 
                                "7796869", "1005862", "5426", "6163033", "5440", "2636"];
  var invalid_preorder_cat_id_array = ["1094765", "6197502", "1005862"];
  var invalid_specialbuy_cat_id_array = ["4104"];  
  var special_feeds_array = ["clearance", "specialbuy", "bestsellers", "preorder"];
  walmart.taxonomy().then(function(result) { 
    var valid_cat_id_array = []
    result.categories.forEach(function(category){
      special_feeds_array.forEach(function(feed){
        //return only valid categories for feeds. Valid categories found through testing
        if (feed == "clearance") {
          if (!(invalid_clearance_cat_id_array.includes(category.id))) {
            valid_cat_id_array.push(feed+","+category.id);
          }
        }
        else if (feed == "preorder") {
          if (!(invalid_preorder_cat_id_array.includes(category.id))) {
            valid_cat_id_array.push(feed+","+category.id);
          }
        }
        else if (feed == "specialbuy") {
          if (!(invalid_specialbuy_cat_id_array.includes(category.id))) {
            valid_cat_id_array.push(feed+","+category.id);
          }
        }
        else {
          valid_cat_id_array.push(feed+","+category.id);
        }
      })               
    })
  
    // map clearance call over valid_cat_id_array
    var category_feed_array = valid_cat_id_array.map(feed_and_cat_id => () => walmart.getSpecifiedFeed(feed_and_cat_id));
    
    // execute Promises serially
    promiseSerial(category_feed_array)
      .then(function(results){
        results.forEach(function(item){
          //uses upc for identification
          if (item.hasOwnProperty('upc')){
            //writing file blocks occasionally, so setting time out to 30 milliseconds for each write
            setTimeout(function(){ fs.appendFileSync('special_feeds_items.txt', extractProductInfo(item)) }, 30);;
          }        
        })
      })
      .catch(console.error.bind(console))
  });
}

function getSingleListOfPaginatedItems(feed_and_cat_id){
  
  //Writes all the feed deals in string representing a feed and category id to a file. 
  
  //prepare to use feed and cat_id by splitting them
  feed = feed_and_cat_id.split(',')[0]
  cat_id = feed_and_cat_id.split(',')[1]
  
  return new Promise(
    function (resolve, reject) {
      walmart.paginateByCategory(parseInt(cat_id), feed, function(response) {
        var results_array = getRecursiveResponse(response);
        resolve();
      });
    }
  );
}

function getPaginatedSpecialFeeds(){
  /*
    Goes through all valid feed/category combinations and returns Promises of getSingleListOfPaginatedItems
  */
  
  special_feeds_array = [ "specialbuy", "preorder", "clearance" ];
  //get categories available and retrieve deal information for each one
  walmart.taxonomy().then(function(result) {
    var valid_cat_id_array = [];
    result.categories.forEach(function(category){
      special_feeds_array.forEach(function(feed){
        /*
          go through each feed and prepare string combination of feed and cat_id
          to retrieve information for.
        */
          valid_cat_id_array.push(feed+","+category.id); 
      })
    });

    // map clearance call over valid_cat_id_array
    var category_special_feeds_array = valid_cat_id_array.map(feed_and_cat_id => () => getSingleListOfPaginatedItems(feed_and_cat_id));
    
    // execute Promises serially
    promiseSerial(category_special_feeds_array)
  })
}




getSpecialFeedsItems();
//getPaginatedSpecialFeeds();
