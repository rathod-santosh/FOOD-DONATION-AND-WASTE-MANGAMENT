const axios = require('axios');
const Donor = require('../models/donor');
const Donation = require('../models/donation');
const NGO = require('../models/ngo');

module.exports = {
  async processMessage(message) {
    // Food-related queries
    if (this.isFoodQuery(message)) {
      const foodItem = this.extractFoodItem(message);
      return foodItem ? this.getFoodInfo(foodItem) : 'Please specify a food item';
    }

    // Project statistics
    if (this.isStatsQuery(message)) {
      return this.getProjectStats();
    }

    // Default response
    return this.getDefaultResponse();
  },

  // Food information handler
  async getFoodInfo(foodItem) {
    try {
      const response = await axios.get('https://api.edamam.com/api/food-database/v2/parser', {
        params: {
          app_id: process.env.EDAMAM_APP_ID,
          app_key: process.env.EDAMAM_APP_KEY,
          ingr: foodItem
        }
      });

      const foodData = response.data?.hints?.[0]?.food;
      if (!foodData) return `No information found for ${foodItem}`;

      return `Nutritional information for ${foodItem}:
• Calories: ${foodData.nutrients.ENERC_KCAL} kcal
• Protein: ${foodData.nutrients.PROCNT}g
• Fat: ${foodData.nutrients.FAT}g
• Carbohydrates: ${foodData.nutrients.CHOCDF}g`;

    } catch (error) {
      console.error('Food API Error:', error);
      return 'Sorry, I couldn\'t retrieve food information at the moment';
    }
  },

  // Project statistics handler
  async getProjectStats() {
    try {
      const [donors, pending, ngoCount] = await Promise.all([
        Donor.countDocuments(),
        Donation.countDocuments({ status: 'pending' }),
        NGO.countDocuments()
      ]);

      return `Current Project Statistics:
• Registered Donors: ${donors}
• Pending Donations: ${pending}
• Active NGOs: ${ngoCount}`;

    } catch (error) {
      console.error('Database Error:', error);
      return 'Sorry, I couldn\'t retrieve statistics right now';
    }
  },

  // Helper methods
  isFoodQuery(text) {
    return /nutrition|calories|protein|fat|carb|food|recipe/i.test(text);
  },

  isStatsQuery(text) {
    return /stat|count|number|how many|pending/i.test(text);
  },

  extractFoodItem(text) {
    const foodMatch = text.match(/(?:nutrition|calories|protein) (?:of|for|in) (.*)/i);
    return foodMatch ? foodMatch[1] : null;
  },

  getDefaultResponse() {
    return `I can help with:
1. Food nutrition information (e.g., "Calories in an apple")
2. Project statistics (e.g., "How many pending donations?")
Ask me anything!`;
  }
};