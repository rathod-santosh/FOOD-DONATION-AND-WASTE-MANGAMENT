const express = require("express");
const { acceptDonation } = require("../controllers/ngoController");

const router = express.Router();

// Route to accept a donation
router.post("/ngo/accept-donation/:donationId", acceptDonation);

module.exports = router;
