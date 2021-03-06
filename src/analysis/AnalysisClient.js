const fs = require('fs');
const path = require('path');
const PairedProductList = require('./../PairedProductList');

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
      ROIThreshold - the cutoff ROI for items the item being considered e.g. 25
      minRatingsValue - minimum average rating of the item being considered e.g. 3.0
      minReviewsCount - minimum number of reviews of the item being considered e.g. 30
  */
  constructor(analysisParameters) {
    this.fbaShippingCostPerPound = 0.50; 
    this.approxTaxRate = 0.06;
    this.analyzedProductsInfo = [];
    this.effectiveValueOfDollar = 0.98;
    this.ROIThreshold = analysisParameters.minROI;
    this.minRatingsValue = analysisParameters.minRatings;
    this.minReviewsCount = analysisParameters.minNumReviews;
  }

  //returns the total amount paid to walmart when item is purchased
  _getTotalAmountPaidToWalmart(walmartProduct) {
    return parseFloat(((parseFloat(walmartProduct.price) + parseFloat(walmartProduct.shippingCost) + (this.approxTaxRate*parseFloat(walmartProduct.price)))).toFixed(2));
  }
  
  //returns approx cost of shipping to AMZN as an FBA user which 
  //will be paid whether we ship from home or from reseller
  //in the future, this should also include approx cost of stocking items on amazon shelf
  _getApproxAmazonFBACost(amazonProduct) {
    //using the ceiling function instead of round to avoid underestimation.
    return (Math.ceil(parseFloat(amazonProduct.dimensions.weight['C$'])) * this.fbaShippingCostPerPound);
  }

  _getBasicROIData(pairedProduct, amazonFBACost){
    /*
      to determine when to do comparison with amazonPrice or lowestOfferPrice
      when doing Simple Cost analysis, the lowestOffer obj will be empty, so it will use amazon price
      when doing secondary analysis, items with lowest offer will use lowestOffer price, other items will use amazonPrice
    */
    const amazonPrice = parseFloat(pairedProduct.amazonProd.lowestOfferInfo ? pairedProduct.amazonProd.lowestOfferInfo.lowestOfferInfo.Price.LandedPrice.Amount : pairedProduct.amazonProd.price);
    const totalPaidToWalmart = this._getTotalAmountPaidToWalmart(pairedProduct.walmartProd);
    const totalCostPerItem = (totalPaidToWalmart + amazonFBACost);
    const dollarROIPerItem = (amazonPrice - totalCostPerItem).toFixed(2);    
    return {
      basicTotalCostPerItem: totalCostPerItem,
      basicDollarROIPerItem: dollarROIPerItem,
      basicPercentROIPerItem: Math.round(parseFloat(dollarROIPerItem / (totalCostPerItem)) * 100)
    }
  }
  

  /*
    giftcardgranny.com lets us buy gift cards at places like Walmart at a discounted rate
    e.g. we could buy a $100 gift card for $95. At this rate, each $1 we spend at walmart.com 
    only costs us 95 cents. To start, let's use a 2% savings of what we spend at Walmart, 
    although I have seen deals for >=3% consistently.
  */
  _getGCGROIData(pairedProduct, amazonFBACost){
    /*
      to determine when to do comparison with amazonPrice or lowestOfferPrice
      when doing Simple Cost analysis, the lowestOffer obj will be empty, so it will use amazon price
      when doing secondary analysis, items with lowest offer will use lowestOffer price, other items will use amazonPrice
    */
    const amazonPrice = parseFloat(pairedProduct.amazonProd.lowestOfferInfo ? pairedProduct.amazonProd.lowestOfferInfo.lowestOfferInfo.Price.LandedPrice.Amount : pairedProduct.amazonProd.price);
    const totalPaidToWalmartWithGCG = parseFloat((this.effectiveValueOfDollar * this._getTotalAmountPaidToWalmart(pairedProduct.walmartProd)).toFixed(2));
    const totalCostPerItemWithGCG = (totalPaidToWalmartWithGCG + amazonFBACost);
    const dollarROIPerItemWithGCG = (amazonPrice - totalCostPerItemWithGCG).toFixed(2);
    return {
      gCGTotalCostPerItem: totalCostPerItemWithGCG,
      gCGDollarROIPerItem: dollarROIPerItemWithGCG,
      gCGPercentROIPerItem: Math.round(parseFloat(dollarROIPerItemWithGCG / (totalCostPerItemWithGCG)) * 100)
    }
  }

  _getAnalyzedProductInfo(pairedProduct){
    const amazonFBACost = +this._getApproxAmazonFBACost(pairedProduct.amazonProd).toFixed(2);
    const gCGROIData = this._getGCGROIData(pairedProduct, amazonFBACost);
    const basicROIData = this._getBasicROIData(pairedProduct, amazonFBACost);
    const analyzedProductInfo =  {
      baseTotalPaid: basicROIData.basicTotalCostPerItem,
      baseDollarROI: basicROIData.basicDollarROIPerItem,
      basePercentROI: basicROIData.basicPercentROIPerItem,
      gCGTotalPaid: gCGROIData.gCGTotalCostPerItem,
      gCGDollarROI: gCGROIData.gCGDollarROIPerItem,
      gCGPercentROI: gCGROIData.gCGPercentROIPerItem,
      upc: pairedProduct.amazonProd.upc,
      category: pairedProduct.amazonProd.category,
      isWeightComputed: pairedProduct.amazonProd.dimensions.weightComputed,
      ASIN: pairedProduct.amazonProd.ASIN,
      UPC: pairedProduct.amazonProd.upc
    }
    return analyzedProductInfo;
  }

  // Save all analyzed products info to a file.
  _writeToFile(fileName, categorizedItems) {
    let textLine;
    let analyzedItemsFile = fs.createWriteStream(fileName);
    analyzedItemsFile.on('error', function(err) { console.log(err) });
    categorizedItems.forEach(function(analyzedProductInfo) {
      textLine = `UPC: ${analyzedProductInfo.upc}, BASE TOTAL COST: ${analyzedProductInfo.baseTotalPaid}, ` + 
        `BASE DOLLAR ROI: ${analyzedProductInfo.baseDollarROI}, BASE PERCENT ROI: ${analyzedProductInfo.basePercentROI}, ` + 
        `GCG TOTAL COST: ${analyzedProductInfo.gCGTotalPaid}, GCG DOLLAR ROI: ${analyzedProductInfo.gCGDollarROI}, ` + 
        `GCG PERCENT ROI: ${analyzedProductInfo.gCGPercentROI}, WEIGHT COMPUTED: ${analyzedProductInfo.isWeightComputed}`+"\r\n";
      analyzedItemsFile.write(textLine);
    });
    analyzedItemsFile.end();
  }

  // writes all categories to their separate files in a particular folder
  _writeAllCategories(categorizedItems){
    let category;
    let categorizedItemsFileName;
    let analysisFolderName = path.join(__dirname, "results", "/");
    if (!fs.existsSync(analysisFolderName)) {
      fs.mkdirSync(analysisFolderName);
    }    
    for (category in categorizedItems) {
      categorizedItemsFileName = analysisFolderName+category.toLowerCase()+".txt";
      this._writeToFile(categorizedItemsFileName, categorizedItems[category]);
    }
  }


  _assignRepresentativeWeightToItem(pairedProductsList){
    /*
    If we have seen at least five item in a category, assign 3/4 of the max weight in a category to an item 
    in that category whose weight is unknown
    The choice of 3/4 of max is arbitrary and can be changed in the future.    
    If we have seen less than 5, use the max weight instead because we don't know enough about weights in category
    */
    const representativeCount = 5;
    const representativeWeight = 0.75;
    let categoriesRepWeight  = {};
    let categoriesCount  = {};
    
    pairedProductsList.products.forEach(function(pairedProduct){
      //if weight is known and categoryId is defined
      if (pairedProduct.amazonProd.dimensions.weight != 'UNKNOWN' && pairedProduct.amazonProd.category) {
        if (categoriesRepWeight.hasOwnProperty(pairedProduct.amazonProd.category)) {
          if (categoriesRepWeight[pairedProduct.amazonProd.category] < Math.ceil(parseFloat(pairedProduct.amazonProd.dimensions.weight['C$']))) {
            categoriesRepWeight[pairedProduct.amazonProd.category] = Math.ceil(parseFloat(pairedProduct.amazonProd.dimensions.weight['C$']));
          }
          categoriesCount[pairedProduct.amazonProd.category] +=1;
        }
        else {
          categoriesRepWeight[pairedProduct.amazonProd.category] = Math.ceil(parseFloat(pairedProduct.amazonProd.dimensions.weight['C$']));
          categoriesCount[pairedProduct.amazonProd.category] =1;
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
  
  _filterProductsToCategories(){
    /* filters all analyzed products into different categories because
      it is possible that we will not be able to sell in some categories.
      Once we know those categories, we won't have to worry about products in there.
      When we become eligible to sell in those categories, we can look at those items then.
    */
    let categorizedItems = {};
    this.analyzedProductsInfo.forEach(function (analyzedProductInfo) {
      if (categorizedItems.hasOwnProperty(analyzedProductInfo.category)) {
        categorizedItems[analyzedProductInfo.category].push(analyzedProductInfo);
      }
      else{
        categorizedItems[analyzedProductInfo.category] = [];
        categorizedItems[analyzedProductInfo.category].push(analyzedProductInfo);
      }
    })
    return categorizedItems;
  }

  _printAnalysisParameters(){  
    console.log(`Searching for items matching following criteria: Minimum ROI(%) - ${this.ROIThreshold}, Minimum Ratings - ${this.minRatingsValue},`
      + ` Minimum Number of Reviews - ${this.minReviewsCount}`);
  }

  /* does simple analysis of cost per item based on shipping and weight */
  getSimpleCostAnalysis(pairedProductsList) {
    let that = this;
    that._printAnalysisParameters()
    //use representative weight of each category to assign weight values to items with unknown weights
    //this helps to compute their shipping price and see what is the profit potential for such items.
    let representativeWeights = that._assignRepresentativeWeightToItem(pairedProductsList);
    let analyzedProduct;
    let profitablePairedProducts = new PairedProductList();       
    pairedProductsList.products.forEach(function(pairedProduct){
      //if weight unknown, if we have computed_weight for category, assign it and set_flag 
      //there will be items whose category we don't have weight values for, let those slip through
      if (pairedProduct.amazonProd.dimensions.weight == 'UNKNOWN') {
        if (representativeWeights.hasOwnProperty(pairedProduct.amazonProd.category)) {
          pairedProduct.amazonProd.dimensions.weightComputed = true;
          pairedProduct.amazonProd.dimensions.weight = {};
          pairedProduct.amazonProd.dimensions.weight['C$'] = representativeWeights[pairedProduct.amazonProd.category];
          analyzedProduct = that._getAnalyzedProductInfo(pairedProduct);
        }
      } else {
        analyzedProduct = that._getAnalyzedProductInfo(pairedProduct);
      }
      if (analyzedProduct.basePercentROI >= that.ROIThreshold) {
        profitablePairedProducts.addPairedProduct(pairedProduct.amazonProd, pairedProduct.walmartProd);
      } 
    });
    return profitablePairedProducts;
  }


  /*
    Does profitability analysis of item based on lowest price offered
    Input_params: PairedProductsList object of potentially profitable items
    Returns: PairedProductsList object of profitable items.
  */
  getSecondaryAnalysis(pairedProductsList) {
    /*
      for each product, compare its total cost with the lowest offer price
      if its price gives us ROI >= threshold_ROI%, we can include it in the to-buy list
      At this point, we are taking minimal risk. It is possible to still buy and sell
      quickly if our ROI < 25% but we can look into that after we establish profitability
      with this cautious approach     
    */
    let that = this;
    let profitablePairedProducts = new PairedProductList();       
    pairedProductsList.products.forEach(function(pairedProduct){
      if (that._getAnalyzedProductInfo(pairedProduct).basePercentROI >= that.ROIThreshold) {
        profitablePairedProducts.addPairedProduct(pairedProduct.amazonProd, pairedProduct.walmartProd);
      } 
    });
    return profitablePairedProducts;
  }


  /*
    Does ratings and reviews analysis by only keeping items that have a 
    rating of >= 3.0 and a review count of >= 30.
    Input_params: PairedProductsList object of potentially profitable items
    Returns: PairedProductsList object of profitable items.
  */
  getPreferredAndPopularItems(pairedProductsList) {
    let that = this;
    let preferredAndPopularPairedProducts = new PairedProductList();       
    pairedProductsList.products.forEach(function(pairedProduct){
      if ((pairedProduct.amazonProd.ratingsAndReviews.itemRating >= that.minRatingsValue) && (pairedProduct.amazonProd.ratingsAndReviews.itemNumReviews >= that.minReviewsCount)) {
        preferredAndPopularPairedProducts.addPairedProduct(pairedProduct.amazonProd, pairedProduct.walmartProd);
      } 
    });
    return preferredAndPopularPairedProducts;
  }
}
module.exports = AnalysisClient;
