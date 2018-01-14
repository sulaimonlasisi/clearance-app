if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

var walmart = require('../index.js')(process.env.WALMART_API_KEY, {protocol: 'http'});

walmart.stores.search(100, "cheerios").then(function(data) {
  console.log("Found " + data.count + " items");
});

walmart.getItem(10449075).then(function(item) {
  console.log(item.product.productName);
});

walmart.getItemByUPC("041100005373").then(function(item) {
  console.log(item.product.productName);
});




function writeSubCategoryIdsToFile(){
  /*
    paths are are separated by "/" between categories. max of 3 categories possible.
    ids are separated by "_" between categories. max of 3 categories possible.
    we may not need info up to the lowest level but if we do need it for description, this
    function will generate the classification tree

    gets as much info about a category as possible - nests further if walmart provides info
    can be used to find clearance item by only checking the first id before an underscore

    outputs in the format: upper_category/middle_category/lowest_category,upper-id_middle-id_lowest_id
  */
  walmart.taxonomy().then(function(data){
    for (var i = 0; i < data.categories.length ; i++) {
      //fs.appendFileSync('subcategory_info.txt', 'data to append');
      if (data.categories[i].hasOwnProperty('children')){
        for (var j = 0; j < data.categories[i].children.length ; j++) {
          //debugger;
          if (data.categories[i].children[j].hasOwnProperty('children')){
            for (var k = 0; k < data.categories[i].children[j].children.length; k++) {
              var cat_info = data.categories[i].children[j].children[k].path + ',' + data.categories[i].children[j].children[k].id+'\n';
              fs.appendFileSync('subcategory_info.txt', cat_info);
            }
          }
          else {
            var cat_info = data.categories[i].children[j].path + ',' + data.categories[i].children[j].id+'\n';
            fs.appendFileSync('subcategory_info.txt', cat_info);
          }          
        }
      }
      else {
        var cat_info = data.categories[i].name + ' ' + data.categories[i].id+'\n';
        fs.appendFileSync('subcategory_info.txt', cat_info);
      }
    }
  });
}


function writeCategoryIdsToFile(){
  /*
    this function should be enough for getting all ids that can be used to get clearance information
  */
  walmart.taxonomy().then(function(data){
    for (var i = 0; i < data.categories.length ; i++) {
      var cat_info = data.categories[i].name + ',' + data.categories[i].id+'\n';
      fs.appendFileSync('category_info.txt', cat_info);
    }
    //console.log("Number of categories is " + data.categories.length)
  });
}
function writeCategoryIdsOnlyToFile(){
  /*
    this function should be enough for getting all ids that can be used to get clearance information
  */
  walmart.taxonomy().then(function(data){
    for (var i = 0; i < data.categories.length ; i++) {
      var cat_info = data.categories[i].id+'\n';
      //fs.appendFileSync('category_ids.txt', cat_info);
    }
    console.log("Number of categories is " + data.categories.length)
  });
}



writeCategoryIdsOnlyToFile();