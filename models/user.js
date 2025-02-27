const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },


  ngoBalance: {
    type: Number,
    default: 0
  },
  deliveryRates: {
    perKm: Number,
    baseFee: Number
  },

  address: {
    type: String,
    required: function() {
        return this.role === 'NGO';
    },
    default: ''
},


  // role: {
  //   type: String,
  //   enum: ['donor', 'ngo', 'delivery'],
  //   default: 'donor'
  // },

  role: {
    type: String,
    enum: ['user', 'NGO', 'DELIVERY'], // Must match exactly
    default: 'user'
},
  deliveryDetails: {
    vehicleType: String,
    licenseNumber: String,
    availability: {
      type: Boolean,
      default: true
    }
  }
});

module.exports = mongoose.model("User", userSchema);
