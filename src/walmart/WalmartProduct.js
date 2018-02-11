/* Class representing a store item */
class WalmartProduct {

  constructor(product) {
    this.availableOnline = product.availableOnline;
    this.brandName = product.brandName;
    this.freeShippingOver50Dollars = product.freeShippingOver50Dollars;
    this.name = product.name;
    this.price = product.salePrice ? product.salePrice : product.msrp;
    this.productUrl = product.productUrl;
    this.standardShipdRate = product.standardShipdRate;
    this.stock = product.stock;
    this.upc = product.upc;
  }

  // Returns a string of the basic product information.
  print() {
    return `${this.name}, ${this.upc}, ${this.price}; `;
  }

}

module.exports = WalmartProduct;
