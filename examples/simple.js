fs = require('fs');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

var walmart = require('../index.js')(process.env.WALMART_API_KEY, {protocol: 'http'});

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
        results_array = results_array.concat(getRecursiveResponse(resp));
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
const paginatedPromiseSerial = cat_array =>
  cat_array.reduce((promise, func) =>
  promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]))







function getSpecialFeedsItems(){
  /*
    Gets special feeds deals on items available in all categories.
  */
  
  var special_feeds_array = ["clearance", "specialbuy", "bestsellers", "preorder"];
  
  walmart.taxonomy().then(function(result) { 
    //counters for the categories that we got deals for
    var promises_fulfilled = 0
    var upc_items_count = 0;
    var prom_with_items = 0;
    var total_items_count = 0;
    
    var category_id_array = []; //holds all feeds/category info
    var category_feed_promises_array = []; //holds promises for each feed/category request

    //prepare all feed/id combination to be requested
    result.categories.forEach(function(category){
      special_feeds_array.forEach(function(feed){
        category_id_array.push(feed+","+category.id);
      })               
    })

    //implement all requests and save them in promises array
    category_id_array.forEach(function(feed_and_cat_id, index){
      category_feed_promises_array.push(walmart.getSpecifiedFeed(feed_and_cat_id, index));
    });
    
    /*
      get all promises and only check the ones that were fulfilled    
      because some cat_ids usually fail, we don't want to consider them
    */
    Promise.all(category_feed_promises_array.map(function(promise) {
      return promise.reflect();
    })).then(function(inspections) {
      var results_array = [];  //saves results of all fulfilled deals    
      inspections.forEach(function(inspection) {       
        if (inspection.isFulfilled()) {
          promises_fulfilled = promises_fulfilled +1;
          if (inspection.value().hasOwnProperty('items')) {
            prom_with_items = prom_with_items+1; //feeds that had a deal
            total_items_count = total_items_count+ inspection.value().items.length //total items returned
            inspection.value().items.forEach(function(item){
              if (item.hasOwnProperty('upc')) {
                upc_items_count = upc_items_count+1 //tracking upc_count -- should equal num items in file
                results_array.push(item)
              }
            })
          }                    
        }
      })
      return results_array;
    }).then(function(results){
        //write to file
        var special_feeds_file = fs.createWriteStream('special_feeds_items.txt');
        special_feeds_file.on('error', function(err) { console.log(err)/* error handling */ });
        results.forEach(function(upc_item) { special_feeds_file.write(extractProductInfo(upc_item)); });
        special_feeds_file.end();
        
        //book keeping
        console.log("Total Feeds Requested: "+category_feed_promises_array.length)
        console.log("Feeds successfully returned from API: "+promises_fulfilled)
        console.log("UPC Items Count: "+upc_items_count)
        console.log("Feeds with Items: "+prom_with_items)
        console.log("Total Items: "+total_items_count)
    }).catch(console.error.bind(console))      
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
    debugger;
    // execute Promises serially
    paginatedPromiseSerial(category_special_feeds_array)
  })
}




//getSpecialFeedsItems();
getPaginatedSpecialFeeds();
