// Handles NGO accepting a donation and choosing pickup/delivery.


const Donation = require("../models/donation");

exports.acceptDonation = async (req, res) => {
    const { donationId, deliveryOption, deliveryFee } = req.body;

    try {
        const donation = await Donation.findById(donationId);
        
        donation.status = "Accepted";
        donation.deliveryOption = deliveryOption;
        if (deliveryOption === "Delivery Service") {
            donation.deliveryFee = deliveryFee || 0;
        }
        await donation.save();

        res.redirect("/ngo-dashboard");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error accepting donation.");
    }
};


exports.updateDonationStatus = async (req, res) => {
    try {
        const { donationId, deliveryMethod, deliveryCharge, pickupLocation, dropLocation } = req.body;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ message: "Donation not found" });
        }

        donation.deliveryMethod = deliveryMethod;

        if (deliveryMethod === "assigned_delivery") {
            if (!pickupLocation || !dropLocation) {
                return res.status(400).json({ message: "Pickup and Drop location are required" });
            }
            donation.pickupLocation = pickupLocation;  // ✅ Ensure this is saved
            donation.dropLocation = dropLocation;  // ✅ Ensure this is saved
            donation.deliveryCharge = deliveryCharge || 0;
            donation.deliveryStatus = "pending_delivery"; // ✅ Ensure the status updates correctly
        }

        await donation.save();

        res.json({ success: true, message: "Donation updated successfully!" });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
