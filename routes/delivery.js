const express = require('express');
const router = express.Router();
const Donation = require('../models/donation'); // Assuming you have a Donation model
const Notification = require('../models/notification'); // Assuming a Notification model

// Accept a delivery request
router.post('/accept-delivery/:id', async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });

        donation.status = "accepted_delivery";
        await donation.save();

        // Notify NGO about acceptance
        await Notification.create({
            message: `Delivery for ${donation.foodname} has been accepted.`,
            date: new Date()
        });

        res.json({ success: true, message: "Delivery accepted and NGO notified." });
    } catch (error) {
        console.error("Error accepting delivery:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;
