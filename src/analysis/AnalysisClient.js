const fs = require('fs');

/* Class for handling product profitability analysis */
class AnalysisClient {
   
  /*
    Instance Attributes:
      //estimated shipping per pound to amzn is 50 cents/pound) Found a 0.40 avg at 
      //https://sellercentral.amazon.com/forums/t/how-much-does-it-cost-to-ship-fba-items-to-amazon/206820/7+
      fbaShippingCostPerPound - current cost/pound to ship to amazon for FBA user;
      approxTaxRate - accounts for tax on item when purchasing from walmart
      effectiveValueOfOurDollar - because of sites like giftcardgranny.com and eBay, for every dollar we spend
      at walmart, we could actually be spending less e.g. 98 cents.
  */
  constructor() {
    this.fbaShippingCostPerPound = 0.50; 
    this.approxTaxRate = 0.06;
    this.analyzedProductsInfo = [];
    this.effectiveValueOfDollar = 0.98;
  }

  //returns the total amount paid to walmart when item is purchased
  getTotalAmountPaidToWalmart(walmartProduct) {
    return (parseFloat(walmartProduct.price) + parseFloat(walmartProduct.shippingCost) + (this.approxTaxRate*parseFloat(walmartProduct.price)));
  }
  
  //returns approx cost of shipping to AMZN as an FBA user which 
  //will be paid whether we ship from home or from reseller
  //in the future, this should also include approx cost of stocking items on amazon shelf
  getApproxAmazonFBACost(amazonProduct) {
    //using the ceiling function instead of round to avoid underestimation.
    return (Math.ceil(parseFloat(amazonProduct.dimensions.weight['C$'])) * this.fbaShippingCostPerPound);
  }

  getBasicROIData(pairedProduct, amazonFBACost){
    let totalPaidToWalmart = +this.getTotalAmountPaidToWalmart(pairedProduct.walmartProd).toFixed(2);
    let totalCostPerItem = (totalPaidToWalmart + amazonFBACost);
    let dollarROIPerItem = +(parseFloat(pairedProduct.amazonProd.price) - totalCostPerItem).toFixed(2);    
    return {
      basicTotalCostPerItem: (totalPaidToWalmart + amazonFBACost),
      basicDollarROIPerItem: +(parseFloat(pairedProduct.amazonProd.price) - totalCostPerItem).toFixed(2),
      basicPercentROIPerItem: Math.round(parseFloat(dollarROIPerItem / (totalCostPerItem)) * 100)
    }
  }
  

  /*
    giftcardgranny.com lets us buy gift cards at places like Walmart at a discounted rate
    e.g. we could buy a $100 gift card for $95. At this rate, each $1 we spend at walmart.com 
    only costs us 95 cents. To start, let's use a 2% savings of what we spend at Walmart, 
    although I have seen deals for >=3% consistently.
  */
  getGCGROIData(pairedProduct, amazonFBACost){
    let totalPaidToWalmartWithGCG = +(this.effectiveValueOfDollar * (+this.getTotalAmountPaidToWalmart(pairedProduct.walmartProd).toFixed(2))).toFixed(2);
    let totalCostPerItemWithGCG = (totalPaidToWalmartWithGCG + amazonFBACost);
    let dollarROIPerItemWithGCG = +(parseFloat(pairedProduct.amazonProd.price) - totalCostPerItemWithGCG).toFixed(2);
    return {
      gCGTotalCostPerItem: (totalPaidToWalmartWithGCG + amazonFBACost),
      gCGDollarROIPerItem: +(parseFloat(pairedProduct.amazonProd.price) - totalCostPerItemWithGCG).toFixed(2),
      gCGPercentROIPerItem: Math.round(parseFloat(dollarROIPerItemWithGCG / (totalCostPerItemWithGCG)) * 100)
    }
  }

  getAnalyzedProductInfo(pairedProduct){
    let amazonFBACost = +this.getApproxAmazonFBACost(pairedProduct.amazonProd).toFixed(2);
    let gCGROIData = this.getGCGROIData(pairedProduct, amazonFBACost);
    let basicROIData = this.getBasicROIData(pairedProduct, amazonFBACost);
    let analyzedProductInfo =  {
      baseTotalPaid: basicROIData.basicTotalCostPerItem,
      baseDollarROI: basicROIData.basicDollarROIPerItem,
      basePercentROI: basicROIData.basicPercentROIPerItem,
      gCGTotalPaid: gCGROIData.gCGTotalCostPerItem,
      gCGDollarROI: gCGROIData.gCGDollarROIPerItem,
      gCGPercentROI: gCGROIData.gCGPercentROIPerItem,
      upc: pairedProduct.amazonProd.upc
    }
    return analyzedProductInfo;
  }

  // Save all analyzed products info to a file.
  writeToFile(fileName) {
    let textLine;
    let analyzed_items_file = fs.createWriteStream(fileName);
    analyzed_items_file.on('error', function(err) { console.log(err) });
    this.analyzedProductsInfo.forEach(function(analyzedProductInfo) {
      textLine = `UPC: ${analyzedProductInfo.upc}, BASE TOTAL COST: ${analyzedProductInfo.baseTotalPaid}, ` + 
        `BASE DOLLAR ROI: ${analyzedProductInfo.baseDollarROI}, BASE PERCENT ROI: ${analyzedProductInfo.basePercentROI}, ` + 
        `GCG TOTAL COST: ${analyzedProductInfo.gCGTotalPaid}, GCG DOLLAR ROI: ${analyzedProductInfo.gCGDollarROI}, ` + 
        `GCG PERCENT ROI: ${analyzedProductInfo.gCGPercentROI}`+"\r\n";
      analyzed_items_file.write(textLine);
    });

    analyzed_items_file.end();
  }


  assignRepresentativeWeightToItem(pairedProductsList){
    /*
    If we have seen at least five item in a category, assign 3/4 of the max weight in a category to an item 
    in that category whose weight is unknown
    The choice of 3/4 of max is arbitrary and can be changed in the future.    
    If we have seen less than 5, use the max weight instead because we don't know enough about weights in category
    */
    let representativeCount = 5;
    let representativeWeight = 0.75;
    let categoriesRepWeight  = {};
    let categoriesCount  = {};
    pairedProductsList.products.forEach(function(pairedProduct){
      //if weight is known and categoryId is defined
      if (pairedProduct.amazonProd.dimensions.weight != 'UNKNOWN' && pairedProduct.amazonProd.bestSalesRanking.categoryId) {
        if (categoriesRepWeight.hasOwnProperty(pairedProduct.amazonProd.bestSalesRanking.categoryId)) {
          if (categoriesRepWeight[pairedProduct.amazonProd.bestSalesRanking.categoryId] < Math.ceil(parseFloat(pairedProduct.amazonProd.dimensions.weight['C$']))) {
            categoriesRepWeight[pairedProduct.amazonProd.bestSalesRanking.categoryId] = Math.ceil(parseFloat(pairedProduct.amazonProd.dimensions.weight['C$']));
          }
          categoriesCount[pairedProduct.amazonProd.bestSalesRanking.categoryId] +=1;
        }
        else {
          categoriesRepWeight[pairedProduct.amazonProd.bestSalesRanking.categoryId] = Math.ceil(parseFloat(pairedProduct.amazonProd.dimensions.weight['C$']));
          categoriesCount[pairedProduct.amazonProd.bestSalesRanking.categoryId] =1;
        }
      }
    });

    for (var category in categoriesRepWeight) {
      if (categoriesCount[category] >= representativeCount) {
        categoriesRepWeight[category] = Math.ceil(categoriesRepWeight[category]*representativeWeight);
      }
    }
    return categoriesRepWeight;
  }

  /* does simple analysis of cost per item based on shipping and weight */
  getSimpleCostAnalysis(pairedProductsList) {
    let that = this;
    //use representative weight of each category to assign weight values to items with unknown weights
    //this helps to compute their shipping price and see what is the profit potential for such items.
    let representativeWeights = that.assignRepresentativeWeightToItem(pairedProductsList)
       
    pairedProductsList.products.forEach(function(pairedProduct){
      //checks if amazon price is known
      if (pairedProduct.amazonProd.price != 'UNKNOWN') {
        //if weight unknown, if we have computed_weight for category, assign it and set_flag 
        //there will be items whose category we don't have weight values for, let those slip through
        if (pairedProduct.amazonProd.dimensions.weight == 'UNKNOWN') {
          if (representativeWeights.hasOwnProperty(pairedProduct.amazonProd.bestSalesRanking.categoryId)) {
            pairedProduct.amazonProd.dimensions.weightComputed = true;
            pairedProduct.amazonProd.dimensions.weight = {};
            pairedProduct.amazonProd.dimensions.weight['C$'] = representativeWeights[pairedProduct.amazonProd.bestSalesRanking.categoryId];
            that.analyzedProductsInfo.push(that.getAnalyzedProductInfo(pairedProduct));
          }
        } else {
          that.analyzedProductsInfo.push(that.getAnalyzedProductInfo(pairedProduct));
        }
        
      }
    })
    
    //write price analysis info for analyzed products
    this.writeToFile("analyzed_items_info.txt");
  }
}

module.exports = AnalysisClient;