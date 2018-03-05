/* Class representing a store item */
class WalmartProduct {

  constructor(product) {
    this.itemId = product.itemId;
    this.brandName = product.brandName;
    this.freeShippingOver50Dollars = product.freeShippingOver50Dollars;
    this.name = product.name;
    this.price = product.salePrice ? product.salePrice : product.msrp;
    this.productUrl = product.productUrl;
    this.shippingCost = this.getShippingCost(product);
    this.stock = product.stock;
    this.upc = product.upc;
  }

  // Returns a string of the basic product information.
  print() {
    return `${this.name}, ${this.upc}, ${this.price}` + "\r\n";
  }

  //calculate the shipping cost based on the shipping cost attribute
  getShippingCost(product){
    let price = product.salePrice ? product.salePrice : product.msrp;
    if (product.freeShippingOver50Dollars) {
      if (price > 50.00) {
        return 0.00;
      }
    }
    return parseFloat(product.standardShipRate);
  }

}

module.exports = WalmartProduct;
