require('dotenv').config(); // Add this at the top
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify connection configuration
transporter.verify((error) => {
    if (error) {
        console.error(" Email transporter verification failed:", error);
    } else {
        console.log("✅ Email transporter ready");
    }
});

module.exports = transporter;