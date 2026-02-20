const mongoose = require("mongoose");

const AcceptedDeliverySchema = new mongoose.Schema({
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deliveryCharge: { type: Number, required: true },
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    status: { type: String, default: "accepted_delivery" }
});

module.exports = mongoose.model("AcceptedDelivery", AcceptedDeliverySchema);
