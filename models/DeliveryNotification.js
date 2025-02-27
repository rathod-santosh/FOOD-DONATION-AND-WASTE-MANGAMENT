const mongoose = require("mongoose");

const DeliveryNotificationSchema = new mongoose.Schema({
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true }, // ✅ NGO receiving the notification
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ✅ Who accepted delivery
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true }, // ✅ Related donation
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DeliveryNotification", DeliveryNotificationSchema);
