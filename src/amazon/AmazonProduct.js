const salesRankings = require('./../sales_rankings');

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
    this.upc = UPC ? UPC : 'UNKNOWN'
    this.category = product.AttributeSets['ns2:ItemAttributes']['ns2:ProductGroup'];
    this.MIN_SELL_PRICE = 10; // $10
  }

  // Returns a string of the basic product information.
  print() {
    return `ASIN: ${this.ASIN}, NAME: ${this.name}, PRICE: ${this.price}, ` +
    `RANK: ${this.bestSalesRanking.rank}, RANK CATEGORY: ${this.bestSalesRanking.categoryId}` + "\r\n";
  }

  /* Profitable products are ones with a good sales ranking and a known sales price. */
  isProfitable() {
    return this._isPopular() && this._isWithinSellPrice();
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
    Determine if this amazon product has a known sell price and if it's greater than the required
    minimum. Anything less than the MIN_SELL_PRICE will likely not yield profit after shipping, tax, 
    and initial purchase costs.
  */
  _isWithinSellPrice() {
    return this.price !== 'UNKNOWN' && this.price >= this.MIN_SELL_PRICE;
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
        weight: dimensions['ns2:Weight'] ? dimensions['ns2:Weight'] : 'UNKNOWN'
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
