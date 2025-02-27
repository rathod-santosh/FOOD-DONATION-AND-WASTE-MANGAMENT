const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: "NGO", required: false }, // 🛠️ NGO Notification
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: false }, // 🛠️ Donor Notification
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
