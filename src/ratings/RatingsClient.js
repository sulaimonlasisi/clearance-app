const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const PairedProductList = require('./../PairedProductList');
/* Class that retrieves the ratings and review info for Amazon products
   This uses a hack that stands up a bare-bones chrome page for item ratings and review using
   the item's ASIN.
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
    this.delayTime = 1000; // 1s delay.
  }
  
  /*
    Function that aggregates calls to get all items' information
  */
  async getAllItemsRatingsAndReviews(pairedProductList){
    return this.allProdsReturn(pairedProductList).then((allProds) => {
      let allProducts = new PairedProductList();
      allProds.forEach((product) => {
        allProducts.addPairedProduct(product.amazonProd, product.walmartProd);
      })
      return allProducts;
    });
  }
  
  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  allProdsReturn(pairedProductList){
    return new Promise ((resolve, reject) => {
      try {
        resolve(this.batchedRatingsAndReviewsRequest(pairedProductList));
      }
      catch(err){
        console.log(err);
        reject(err);
      } 
    })
             
  }


  /*
    Batches ratings and reviews request
   */
  batchedRatingsAndReviewsRequest(pairedProductList) {
    return new Promise(async (resolve, reject) => {
      let promises = [];
      let index=0;
      const browser = await puppeteer.launch({headless:false});
      try {
        do {
          if (pairedProductList.products[index]) {
            promises.push(await this.getSingleItemRatingAndReview(browser, pairedProductList.products[index]));
            this.timeout(index*this.delayTime);
          }          
          index+=1;
        } while (index < pairedProductList.products.length);
        await browser.close();                 
        return Promise.all(promises).then(async (promiseArray) => {
          resolve(promiseArray);
        });
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });    
  }

  /*
    Function that single item ratings and reviews to be used for further analysis
  */
  async getSingleItemRatingAndReview(browser, product){
    try {      
      let page = await browser.newPage();
      let item_link = `${this.base_url}${product.amazonProd.ASIN}`;
      await page.goto(item_link);
      //get rating value
      let rating = await page.evaluate(() => document.querySelector(".a-size-base.a-color-secondary").innerText);
      rating = this.parseRating(rating);
      //get number of reviews value
      let numReviews = await page.evaluate(() => document.querySelector(".a-size-small.a-link-emphasis").innerText);
      numReviews = this.parseNumReviews(numReviews);
      product.amazonProd.ratingsAndReviews = {itemRating: rating, itemNumReviews: numReviews};
      await page.close();
      return product;
    } catch(err){
      console.log(err);
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


