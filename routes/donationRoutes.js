const express = require("express");
const router = express.Router();
const Donation = require("../models/track");
const transporter = require("../config/emailConfig");
const User = require("../models/user");
const Notification = require("../models/notification"); // Import the model

// Route for NGO to Accept a Donation
router.post("/accept/:donationId", async (req, res) => {
    try {
        const { donationId } = req.params;
        const ngoId = req.user._id; // Assuming NGO is logged in

        // Find the donation and update it
        const donation = await Donation.findById(donationId).populate("donorId");
        if (!donation) {
            return res.status(404).json({ message: "Donation not found" });
        }

        // Update donation status
        donation.status = "Accepted";
        donation.ngoId = ngoId;
        await donation.save();

        // Get donor's email
        const donorEmail = donation.donorId.email;
        const donorName = donation.donorId.name;

        // Send email to donor
        const mailOptions = {
            from: "demo@gmail.com",
            to: donorEmail,
            subject: "Your Donation Has Been Accepted",
            text: `Hello ${donorName},\n\nYour donation has been accepted by an NGO. They will contact you soon to collect it.\n\nThank you for your generosity!\nFood Donation Team`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Donation accepted and donor notified!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Save notification for the donor
const newNotification = new Notification({
    userId: donation.donorId,
    message: "Your donation has been accepted by an NGO."
});
await newNotification.save();

module.exports = router;
