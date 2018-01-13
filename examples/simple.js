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
