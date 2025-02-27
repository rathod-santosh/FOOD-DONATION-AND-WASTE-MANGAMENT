require('dotenv').config(); // Add this at the top
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify connection configuration
transporter.verify((error) => {
    if (error) {
        console.error("❌ Email transporter verification failed:", error);
    } else {
        console.log("✅ Email transporter ready");
    }
});

module.exports = transporter;