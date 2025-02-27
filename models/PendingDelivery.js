const mongoose = require("mongoose");

const PendingDeliverySchema = new mongoose.Schema({
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", required: true },
    deliveryCharge: { type: Number, required: true },
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    status: { type: String, default: "pending" }
});

module.exports = mongoose.model("PendingDelivery", PendingDeliverySchema);
