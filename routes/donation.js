const express = require("express");
const router = express.Router();
const { updateDonationStatus } = require("../controllers/donationController");

router.post("/update-donation-status", updateDonationStatus);

module.exports = router;
