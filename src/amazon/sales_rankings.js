/* Constants for Amazon Category Sales Rankings
  SalesRankings represent the rank number a product must under to be within the top 50%
  of item in that category. The numbers may not be exactly correct, but should be in the ballpark.
  Rankings extrapolated from this chart - https://sourcingsimplifiers.com/bsr-chart/
  Comments signify the category from the above chart that the ranking was extrapolated from.
*/
const salesRankings = {
  "Apparel": 7763275, // Estimated from Clothing, Shoes, & Jewelry
  "Art and Craft Supply": 1459640, // Arts, Crafts, & Sewing
  "Automotive Parts and Accessories": 7672620, // Automotive
  "Baby Product": 675440, // Baby
  "Beauty": 863690, // Beauty
  "BISS": 4928450, // Estimated from Industrial & Scientific
  "BISS Basic": 4928450, // Estimated from Industrial & Scientific
  "Book": 28785620, // Books
  "Car Audio or Theater": 3836310, // Estimated from Automotive
  "CE": 47816810, // Electronics (Consumer Electronics)
  "DVD": 635260, // Movies & TV
  "Furniture": 10112926, // Estimated from Home & Kitchen
  "Grocery": 492860, // Grocery & Gourmet Food
  "Health and Beauty": 2548150, // Health & Personal Care
  "Home": 15169390, // Estimated from Home & Kitchen
  "Home Improvement": 5048280, // Tools & Home Improvement
  "Home Theater": 10112926, // Estimated from Home & Kitchen
  "Jewelry": 5175516, // Estimated from Clothing, Shoes, & Jewelry
  "Kitchen": 15169390, // Estimated from Home & Kitchen
  "Lawn & Patio": 1189690, // Patio, Lawn & Garden
  "Lighting": 1682760, // Estimated from Tools & Home Improvement
  "Major Appliances": 442230, // Appliances
  "Music": 3514880, // CDs & Vinyl
  "Musical Instruments": 359270, // Musical Instruments
  "Office Product": 3123460, // Office Products
  "Pantry": 10112926, // Estimated from Home & Kitchen
  "PC Accessory": 4462415, // Estimated from Computers
  "Personal Computer": 8924830, // Computers
  "Pet Products": 480090, // Pet Supplies
  "Photography": 8793540, // Collectibles & Fine Art
  "Shoes": 5175516, // Estimated from Clothing, Shoes & Jewelry
  "Single Detail Page Misc": 1000000, // No idea what this is. Just putting random number
  "Speakers": 15938936, // Estimated from Electronics
  "Sports": 5859365, // Estimated from Sports & Outdoors
  "Target Home": 10112926, // Estimated from Home & Kitchen
  "Toy": 2508990, // Toys & Games
  "Video Games": 225980, // Video Games
  "Watch": 3881637, // Estimated from Clothing, Shoes & Jewelry
  "Wireless Device": 36584630, // Cell Phones & Accessories
  "Wireless": 18292315 // Estimated from Cell Phones & Accessories
};

module.exports = salesRankings;
