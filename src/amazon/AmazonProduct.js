/* Class representing a store item */
class AmazonProduct {

  /*
  product - A single Amazon product.
  */
  constructor(product) {
    this.brand = product.AttributeSets['ns2:ItemAttributes']['ns2:Brand'];
    this.name = product.AttributeSets['ns2:ItemAttributes']['ns2:Title'];
    this.dimensions = this._getProductDimensions(product.AttributeSets['ns2:ItemAttributes']['ns2:PackageDimensions'])
    this.ASIN = product.Identifiers.MarketplaceASIN.ASIN;
    this.bestSalesRanking = this._getBestSalesRanking(product.SalesRankings);
  }

  // Returns a string of the basic product information.
  print() {
    return `${this.ASIN}, ${this.name}, ${this.bestSalesRanking.rank}` + "\r\n";
  }

  // Private methods

  // Returns an object containing the product's dimensions.
  _getProductDimensions(dimensions) {
    if (dimensions) {
      return {
        width: dimensions['ns2:Width'],
        height: dimensions['ns2:Height'],
        length: dimensions['ns2:Length'],
        weight: dimensions['ns2:Weight']
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
    let bestRank ={};

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

}

module.exports = AmazonProduct;
