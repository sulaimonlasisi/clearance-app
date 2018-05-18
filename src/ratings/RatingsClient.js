const puppeteer = require('puppeteer');
const Promise = require('bluebird');

/* Class that retrieves the ratings and review info for Amazon products
   This uses a hack that stands up a bare-bones chrome page for item ratings and review using
   the item's ASIN.
   Had to settle for this since we needed to have a website to get to the Product Advertising API
*/
class RatingsClient {
  /*
    Instance Attributes:
      base_url  - base URL to get review and ratings from.
      delayTime - Amount of time (ms) to delay in between requests. This can be useful when making
                  hundreds of requests since there is a limit to how many can run asynchronously at once.
  */
  constructor() {
    this.base_url = 'https://www.amazon.com/gp/customer-reviews/widgets/average-customer-review/popover/ref=dpx_acr_pop_?contextId=dpx&asin=';
    this.delayTime = 500; // 500ms delay.
  }
  
  /*
    Function that aggregates calls to get all items' information
  */
  async getAllItemsRatingsAndReviews(pairedProductList){
    let productsRatingsList = [];
    pairedProductList.products.forEach((product, delayIndex)=>{
      productsRatingsList.push(this.getSingleItemRatingAndReview(product, delayIndex*this.delayTime)); 
    })
    let results = await Promise.all(productsRatingsList);
    return results;
  }

  /*
    A delay function to pause between puppeteer instantiations
  */
  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /*
    Function that single item ratings and reviews to be used for further analysis
  */
  async getSingleItemRatingAndReview(product, time=0){
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      let item_link = `${this.base_url}${product.amazonProd.ASIN}`;
      await page.goto(item_link);
      //get rating value
      let rating = await page.evaluate(() => document.querySelector(".a-size-base.a-color-secondary").innerText);
      rating = this.parseRating(rating);
      //get number of reviews value
      let numReviews = await page.evaluate(() => document.querySelector(".a-size-small.a-link-emphasis").innerText);
      numReviews = this.parseNumReviews(numReviews);
      await browser.close();
      product.amazonProd.ratingsAndReviews = {itemRating: rating, itemNumReviews: numReviews};
      this.timeout(time);
      return(product);
    } catch(err){
      console.log(err);
      this.timeout(time);
      return err;
    }            
  }

  // Returns a string of the basic product information.
  parseRating(ratingString) {
    return parseFloat(ratingString.split(' ')[0]); 
  }

  // Returns a string of the basic product information.
  parseNumReviews(reviewString) {
    return parseInt(reviewString.split(' ')[2]); 
  }
}
module.exports = RatingsClient;


