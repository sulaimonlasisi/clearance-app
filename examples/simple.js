fs = require('fs');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

let walmart = require('../index.js')(process.env.WALMART_API_KEY, {protocol: 'http'});

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


function writeCategoryIdsToFile(){
  /*
    writes category id and names to file
  */
  walmart.taxonomy().then(function(data){
    data.categories.forEach(function(category){
      let cat_info = category.name + ',' + category.id+'\n';

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
      let cat_info = category.id+'\n';
      fs.appendFileSync('category_ids.txt', cat_info);
    })
  });
}

function extractProductInfo(product){
  let twoThreeDayShippingRate = Object.is(product.twoThreeDayShippingRate, undefined) ? '-1.00' : product.twoThreeDayShippingRate; 
  let msrp = Object.is(product.msrp, undefined) ? '-1.00' : product.msrp;
  let product_info=`${product.itemId},${product.upc},${product.name},${product.brandName},`
  product_info=product_info+`${msrp},${product.salePrice},${product.standardShipRate},${twoThreeDayShippingRate},`
  product_info=product_info+`${product.availableOnline},${product.categoryNode},${product.stock},${product.stock},`
  product_info=product_info+`${product.freeShippingOver50Dollars}\n`
  return product_info;
}

function getRecursiveResponse(response, idx){
  let results_array = [];
  if (response != undefined && response.hasOwnProperty('items')){
    response.items.forEach(function(item){
      // uses upc for identification
      if (item.hasOwnProperty('upc')){
        results_array.push(extractProductInfo(item));
      }
    })
    if (response.nextPage) {
      walmart.getNewPage(response.nextPage, idx).then(function(resp){
        results_array = results_array.concat(getRecursiveResponse(resp, (idx+1)));
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

function getSpecialFeedsItems(){
  /*
    Gets special feeds deals on items available in all categories.
  */
  
  let special_feeds_array = ["clearance", "specialbuy", "bestsellers", "preorder"];
  
  walmart.taxonomy().then(function(result) { 
    //counters for the categories that we got deals for
    let promises_fulfilled = 0
    let upc_items_count = 0;
    let prom_with_items = 0;
    let total_items_count = 0;
    
    let category_id_array = []; //holds all feeds/category info
    let category_feed_promises_array = []; //holds promises for each feed/category request

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
      let results_array = [];  //saves results of all fulfilled deals    
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
        let special_feeds_file = fs.createWriteStream('special_feeds_items.txt');
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

function getPaginatedSpecialFeeds(){
  /*
    Goes through all valid feed/category combinations and returns Promises of getSingleListOfPaginatedItems
  */
  
  let special_feeds_array = [ "specialbuy", "preorder", "clearance" ];
  //get categories available and retrieve deal information for each one
  walmart.taxonomy().then(function(result) {
    let valid_cat_id_array = [];
    result.categories.forEach(function(category){
      special_feeds_array.forEach(function(feed){
        /*
          go through each feed and prepare string combination of feed and cat_id
          to retrieve information for.
        */
        valid_cat_id_array.push(feed+","+category.id); 
      })
    });

    let category_special_feeds_array = [];

    //implement all requests and save them in promises array
    valid_cat_id_array.forEach(function(feed_and_cat_id, index){
      category_special_feeds_array.push(walmart.paginateByCategory(parseInt(feed_and_cat_id.split(',')[1]), feed_and_cat_id.split(',')[0], index));
    });
    
    //get pages from fulfilled promises
    Promise.all(category_special_feeds_array.map(function(promise) {
      return promise.reflect();
    })).then(function(inspections) {
      inspections.forEach(function(inspection, index) {       
        if (inspection.isFulfilled()) {
          getRecursiveResponse(inspection.value(), index)                  
        }
      })
    }).catch(console.error.bind(console))
  })
}

getSpecialFeedsItems();
//getPaginatedSpecialFeeds();
