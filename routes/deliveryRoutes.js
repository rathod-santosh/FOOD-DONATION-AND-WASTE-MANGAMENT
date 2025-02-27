const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/deliveryController");
const Donation = require("../models/donation"); // ✅ Import Donation Model

// ✅ Route to assign a delivery
router.post("/assign-delivery", deliveryController.assignDelivery);

// ✅ Route to complete a delivery
router.post("/complete-delivery", deliveryController.completeDelivery);

// ✅ Route to fetch pending deliveries
router.get("/delivery/pending", async (req, res) => {
    try {
        const pendingDeliveries = await Donation.find({ status: "pending_delivery" }) // ✅ Ensure status field matches
            .select("foodname deliveryCharge pickupLocation dropLocation status");

        res.json(pendingDeliveries);
    } catch (error) {
        console.error("❌ Error fetching pending deliveries:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
