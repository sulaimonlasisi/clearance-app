/* Class representing a store item */
class AmazonProduct {

  /*
  product - A single Amazon product.
  */
  constructor(product) {
    // need to add more attributes to this.
    this.brand = product.AttributeSets['ns2:ItemAttributes']['ns2:Brand'];
    this.name = product.AttributeSets['ns2:ItemAttributes']['ns2:Title'];
  }

  // Returns a string of the basic product information.
  print() {
    return `${this.name}` + "\r\n";
  }

}

module.exports = AmazonProduct;
