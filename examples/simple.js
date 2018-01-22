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


/*
function that serially calls Promise functions and waits for each of them to be resolved
Reference: https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
*/
const promiseSerial = category_clearance_array =>
category_clearance_array.reduce((promise, func) =>
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
                                "7796869", "1005862", "5426", "6163033"];
  var invalid_preorder_cat_id_array = ["1094765", "6197502", "1005862"];
  var invalid_specialbuy_cat_id_array = ["4104"];
  //rollback doesn't work at the moment
  var special_feeds_array = ["clearance", "specialbuy", "bestsellers", "preorder"]; 
  walmart.taxonomy().then(function(result) { 
    var valid_cat_id_array = []
    result.categories.forEach(function(category){
      special_feeds_array.forEach(function(feed){
        //if feed is clearance, of the categories returned, use only the valid ones
        if (feed == "clearance") {
          if (!(invalid_clearance_cat_id_array.includes(category.id))) {
            valid_cat_id_array.push(feed+","+category.id);
          }
        }
        else if (feed == "preorder") {
          //if feed is preorder, of the categories returned, use only the valid ones
          if (!(invalid_preorder_cat_id_array.includes(category.id))) {
            valid_cat_id_array.push(feed+","+category.id);
          }
        }
        else if (feed == "specialbuy") {
          //if feed is specialbuy, of the categories returned, use only the valid ones
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
      .then(function(output){
        output.forEach(function(results){
          if (results.items.length > 0) {
            results.items.forEach(function(item){
              /*because we want to compare the features of this item to another marketplace 
                using some identifier like UPC, it doesn't make sense to retrieve items that don't
                have a UPC. We can review this decision if we find other identifiers
              */
              if (item.hasOwnProperty('upc')){
                fs.appendFileSync('special_feeds_items.txt', extractProductInfo(item));
              }
            })
          }
        })
      })
      .catch(console.error.bind(console))
  });
}

getSpecialFeedsItems();


