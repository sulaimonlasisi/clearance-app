const fs = require('fs');

/* Class representing a list of paired walmart and amazon products */
class PairedProductList {

  constructor() {
    this.products = [];
  }

  addPairedProduct(amazonProduct, walmartProduct) {
    this.products.push(
      {
        amazonProd: amazonProduct,
        walmartProd: walmartProduct
      }
    );
  }

  // Save all products info to a file.
  writeToFile(fileName) {
    let textLine;
    let paired_items_file = fs.createWriteStream(fileName);
    paired_items_file.on('error', function(err) { console.log(err) });
    this.products.forEach(function(pairedProduct) {
      let amazonPrice = (Object.keys(pairedProduct.amazonProd.lowestOfferInfo).length === 0) ? pairedProduct.amazonProd.price : pairedProduct.amazonProd.lowestOfferInfo.lowestOfferInfo.Price.LandedPrice.Amount ;
      textLine = `AMAZON NAME: ${pairedProduct.amazonProd.name}, AMAZON PRICE: ${amazonPrice}, ` + 
        `WALMART NAME: ${pairedProduct.walmartProd.name}, WALMART PRICE: ${pairedProduct.walmartProd.price}` + "\r\n";
      paired_items_file.write(textLine);
    });

    paired_items_file.end();
  }

}

module.exports = PairedProductList;
