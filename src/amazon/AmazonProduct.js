const salesRankings = require('./sales_rankings');

//custom minimum price function
Array.prototype.hasMin = function(attrib) {
  return this.reduce(function(prev, curr){ 
    return parseInt(prev[attrib]['LandedPrice']['Amount']) < parseInt(curr[attrib]['LandedPrice']['Amount']) ? prev : curr; 
  });
}

/* Class representing a store item */
class AmazonProduct {

  /*
  product - A single Amazon product.
  */
  constructor(product, UPC) {
    this.price = this._getListPrice(product.AttributeSets['ns2:ItemAttributes']['ns2:ListPrice']);
    this.brand = product.AttributeSets['ns2:ItemAttributes']['ns2:Brand'];
    this.name = product.AttributeSets['ns2:ItemAttributes']['ns2:Title'];
    this.dimensions = this._getProductDimensions(product.AttributeSets['ns2:ItemAttributes']['ns2:PackageDimensions'])
    this.ASIN = product.Identifiers.MarketplaceASIN.ASIN;
    this.bestSalesRanking = this._getBestSalesRanking(product.SalesRankings);
    this.upc = UPC ? UPC : 'UNKNOWN';
    this.category = product.AttributeSets['ns2:ItemAttributes']['ns2:ProductGroup'];
    this.lowestOfferInfo = null;
  }

  // Returns a string of the basic product information.
  print() {
    return `ASIN: ${this.ASIN}, NAME: ${this.name}, PRICE: ${this.price}, ` +
    `RANK: ${this.bestSalesRanking.rank}, RANK CATEGORY: ${this.bestSalesRanking.categoryId}` + "\r\n";
  }

  /* Profitable products are ones with a good sales ranking and a known sales price and weight. */
  isProfitable() {
    return this._hasKnownPrice() && this._isPopular();
  }


  // Sets the lowest offer info property or leaves it as-is.
  setLowestOfferInformation(lowestOfferInfo) {
    if (Array.isArray(lowestOfferInfo.Product.LowestOfferListings.LowestOfferListing)) {
      this.lowestOfferInfo = { asin: lowestOfferInfo.Product.Identifiers.MarketplaceASIN.ASIN,
        lowestOfferInfo: lowestOfferInfo.Product.LowestOfferListings.LowestOfferListing.hasMin('Price')
      }
    }
  }

  // Private methods
 
  /* Determine if this amazon product will sell well based on the sales rank. */
  _isPopular() {
    if (this.bestSalesRanking.rank !== 'UNKNOWN') {
      if (salesRankings[this.category]) {
        return this.bestSalesRanking.rank <= salesRankings[this.category];
      } else {
        console.log(`Unknown sales category. Add ${this.category} to sales_rankings.js`);
      }
    }
    return false;
  }

  /* 
    Determine if this amazon product has a known sell price.
  */
  _hasKnownPrice() {
    return this.price !== 'UNKNOWN'
  }

  // Returns an object containing the product's dimensions.
  _getProductDimensions(dimensions) {
    if (dimensions) {
      //sometimes, dimensions can be available and some of its attributes would still be unavailable
      //so, checking each attribute's availability independently
      return {
        width: dimensions['ns2:Width'] ? dimensions['ns2:Width'] : 'UNKNOWN',
        height: dimensions['ns2:Height'] ? dimensions['ns2:Height'] : 'UNKNOWN',
        length: dimensions['ns2:Length'] ? dimensions['ns2:Length'] : 'UNKNOWN',
        weight: dimensions['ns2:Weight'] ? dimensions['ns2:Weight'] : 'UNKNOWN',
        weightComputed: dimensions['ns2:Weight'] ? false : true
      }
    } else {
      return {
        width: 'UNKNOWN',
        height: 'UNKNOWN',
        length: 'UNKNOWN',
        weight: 'UNKNOWN'
      }
    }
  }

  /* 
    Amazon products are given a sales rank for each category they belong to.
    Returns an object containing the highest sales rank of a product and it's category.
  */
  _getBestSalesRanking(salesRankings) {
    let bestRank ={
      rank: 'UNKNOWN',
      category: 'UNKNOWN'
    };

    if (salesRankings) {
      if (Array.isArray(salesRankings.SalesRank)) {
        salesRankings.SalesRank.forEach(function(salesRank) {
          if (bestRank.rank == null || salesRank.Rank < bestRank.rank) {
            bestRank = {
              rank: salesRank.Rank, 
              categoryId: salesRank.ProductCategoryId
            }
          }
        });
      }
      else {
        bestRank = {
          rank: salesRankings.Rank,
          categoryId: salesRankings.ProductCategoryId
        }
      }
    }

    return bestRank;
  }

  /* Return the list price amount of the amazon product if known. */
  _getListPrice(listPrice) {
    return listPrice ? listPrice['ns2:Amount'] : 'UNKNOWN';
  }
}

module.exports = AmazonProduct;
