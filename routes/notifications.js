const express = require('express');
const router = express.Router();
const Notification = require('../models/notification'); // Ensure Notification schema exists

// Get all notifications
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ date: -1 }).limit(10);
        res.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;
