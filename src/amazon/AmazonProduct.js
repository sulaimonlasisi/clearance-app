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
  }

  // Returns a string of the basic product information.
  print() {
    return `ASIN: ${this.ASIN}, NAME: ${this.name}, PRICE: ${this.price}, ` +
    `RANK: ${this.bestSalesRanking.rank}, RANK CATEGORY: ${this.bestSalesRanking.categoryId}` + "\r\n";
  }

  // Private methods

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

  /* Return the list price amount of the amazon product if known. */
  _getListPrice(listPrice) {
    return listPrice ? listPrice['ns2:Amount'] : 'UNKNOWN';
  }
}

module.exports = AmazonProduct;
