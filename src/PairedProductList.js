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
      textLine = `AMAZON NAME: ${pairedProduct.amazonProd.name}, AMAZON PRICE: ${pairedProduct.amazonProd.price}, ` + 
        `WALMART NAME: ${pairedProduct.walmartProd.name}, WALMART PRICE: ${pairedProduct.walmartProd.price}` + "\r\n";
      paired_items_file.write(textLine);
    });

    paired_items_file.end();
  }

}

module.exports = PairedProductList;
