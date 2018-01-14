var fetch = require('isomorphic-fetch');
var Promise = require('bluebird');

function _responseToText(response) {
  if (response.status >= 400) {
    throw new Error("Bad server response");
  }
  return response.text();
}

function _get(options, url) {
  return new Promise(function (resolve, reject) {
    var getUrl = (options && options.protocol) ? options.protocol + ":" + url : url;
    debugger;
    fetch(getUrl).then(_responseToText).then(function(item) {
      resolve(JSON.parse(item));
    }).catch(function(err) {
      reject(err);
    });
  });
}

function _feed(options, feed, key, category) {
  var url = "//api.walmartlabs.com/v1/feeds/" + feed + "?apiKey=" + key;
  if (category) {
    url += "&categoryId=" + category;
  }
  return _get(options, url);
}

function _paginate(options, category, brand, key, specialOffer, callback) {
  var url = "//api.walmartlabs.com/v1/paginated/items?apiKey=" + key;
  if (category) {
    url += "&category=" + category;
  }
  if (brand) {
    url += "&brand=" + brand;
  }
  if (specialOffer) {
    url += "&specialOffer=" + specialOffer;
  }
  //so far there can only be one special offer e.g. clearance, rollback, specialbuy
  /*if (extras) {
    for (var k in extras) {
      url += "&" + k + "=" + escape(extras[k]);
    }
  }*/
  if (options && options.nextPage) {
    url =  "//api.walmartlabs.com" + options.nextPage;
  }
  return _get(options, url).then(function(response) {
      if (response.nextPage) {
        options = options || {};
        options.nextPage = response.nextPage;
        response.next = function() {
          _paginate(options, null, null, null, null, callback);
        }
      }
      callback(response);
      return response;
  });
}

function _callback(arg) {
  var args = [].slice.call(arg),
      callback = typeof args[args.length - 1] === 'function' && args.pop() || function() {};
  return callback;
}

module.exports = function(key, options) {
  return {
    getItem: function(itemID, terra) {
      if (terra) {
        return _get(options, "//www.walmart.com/product/terra/" + itemID);
      } else {
        return _get(options, "//www.walmart.com/product/mobile/api/" + itemID);
      }
    },
    getItemByUPC: function(upcCode) {
      return _get(options, "//www.walmart.com/product/mobile/api/upc/" + upcCode);
    },
    feeds: {
      items: function(categoryId) {
        return _feed(options, "items", key, categoryId);
      },
      bestSellers: function(categoryId) {
        return _feed(options, "bestsellers", key, categoryId);
      },
      preOrder: function(categoryId) {
        return _feed(options, "preorder", key, categoryId);
      },
      rollback: function(categoryId) {
        return _feed(options, "rollback", key, categoryId);
      },
      clearance: function(categoryId) {
        return _feed(options, "clearance", key, categoryId);
      },
      specialBuy: function(categoryId) {
        return _feed(options, "specialbuy", key, categoryId);
      },
      valueOfTheDay: function() {
        return _get(options, "//api.walmartlabs.com/v1/vod?apiKey=" + key);
      },
      trending: function() {
        return _get(options, "//api.walmartlabs.com/v1/trends?apiKey=" + key + "&format=json");
      }
    },
    search: function(term, extra) {
      var url = "//api.walmartlabs.com/v1/search?apiKey=" + key + "&query=" + term;
      if (extra) {
        for (var k in extra) {
          url += "&" + k + "=" + escape(extra[k]);
        }
      }
      return _get(options, url);
    },
    taxonomy: function() {
      return _get(options, "//api.walmartlabs.com/v1/taxonomy?apiKey=" + key);
    },
    recommendations: function(itemID) {
      return _get(options, "//api.walmartlabs.com/v1/nbp?apiKey=" + key + "&itemId=" + itemID);
    },
    reviews: function(itemID) {
      return _get(options, "//api.walmartlabs.com/v1/reviews/" + itemID + "?apiKey=" + key + "&format=json");
    },
    stores: {
      byPosition: function(lat, lon) {
        return _get(options, "//api.walmartlabs.com/v1/stores?apiKey=" + key + "&lon=" + lon + "&lat=" + lat );
      },
      byCity: function(city) {
        return _get(options, "//api.walmartlabs.com/v1/stores?apiKey=" + key + "&city=" + escape(city) );
      },
      byZip: function(zip) {
        return _get(options, "//api.walmartlabs.com/v1/stores?apiKey=" + key + "&zip=" + zip );
      },
      search: function(store, query, extras) {
        var url = "http://search.mobile.walmart.com/search?query=" + escape(query) + "&store=" + store;
        if (extras) {
          for (var k in extras) {
            url += "&" + k + "=" + escape(extras[k]);
          }
        }
        return _get({}, url);
      }
    },
    paginateByCategory: function(category, specialOffer) {
      return _paginate(options, category, null, key, specialOffer, _callback(arguments));
    },
    paginateByBrand: function(brand, extras, callback) {
      return _paginate(options, null, brand, key, specialOffer, _callback(arguments));
    }
  }
};