const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
    donationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Donation', 
        required: true 
    },  

    status: { 
        type: String, 
        enum: ['pending_delivery', 'accepted_delivery', 'in_transit', 'delivered'], 
        default: 'pending_delivery' 
    },  

    deliveryCharge: { type: Number, required: true },
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', DeliverySchema);
