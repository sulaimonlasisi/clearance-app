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
    textLine = `Amazon Name\tASIN\tAmazon UPC\tAmazon Price\tWalmart Name\tWalmart UPC\tWalmart ItemID\t`+
    `Walmart Price\tLowestOfferPresent\tWeight Computed`+"\r\n";
    paired_items_file.write(textLine);
    this.products.forEach(function(pairedProduct) {
      const amazonPrice = pairedProduct.amazonProd.lowestOfferInfo ? pairedProduct.amazonProd.lowestOfferInfo.lowestOfferInfo.Price.LandedPrice.Amount : pairedProduct.amazonProd.price;
      const lowestOfferInfo = pairedProduct.amazonProd.lowestOfferInfo ? 'Present' : 'Absent';
      const weightComputed = pairedProduct.amazonProd.dimensions.weightComputed;
      textLine = `${pairedProduct.amazonProd.name}\t${pairedProduct.amazonProd.ASIN}\t${pairedProduct.amazonProd.upc}\t${amazonPrice}\t` + 
        `${pairedProduct.walmartProd.name}\t${pairedProduct.walmartProd.upc}\t${pairedProduct.walmartProd.itemId}\t${pairedProduct.walmartProd.price}\t` + 
        `${lowestOfferInfo}\t${weightComputed}`+"\r\n";
      paired_items_file.write(textLine);
    });
    paired_items_file.end();
  }

}

module.exports = PairedProductList;
