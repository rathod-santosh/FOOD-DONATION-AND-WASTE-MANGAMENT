const mongoose = require("mongoose");

const DonationSchema = new mongoose.Schema({
    foodname: { type: String, required: true },
    meal: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: String, required: true },
    name: { type: String, required: true },
    phoneno: { type: String, required: true },
    district: { type: String, required: true },
    address: { type: String, required: true },
    email: { type: String, required: true },

    pickupLocation: { type: String },
    dropLocation: { type: String },

    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    status: {
        type: String,
        enum: ["Pending", "Accepted", "Collected", "Delivered"],
        default: "Pending"
    },

    deliveryStatus: {
        type: String,
        enum: ["not_assigned", "pending_delivery", "accepted_delivery", "in_transit", "delivered"],
        default: "not_assigned"
    },

    deliveryMethod: {
        type: String,
        enum: ['self_pickup', 'assigned_delivery'],
        default: 'self_pickup'
    },

    deliveryCharge: { type: Number, default: 0 },

    ngo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NGO',
        required: function () {
            return this.deliveryMethod === 'assigned_delivery';
        }
    },

    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Donation", DonationSchema);
