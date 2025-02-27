const Donation = require("../models/donation");

const User = require("../models/user");
const nodemailer = require("nodemailer");

exports.getUserDonations = async (req, res) => {
    try {
        const userEmail = req.user.email; // Ensure authentication middleware is used
        const donations = await Donation.find({ email: userEmail });

        res.render("userDonations", { donations });
    } catch (error) {
        console.error("Error fetching user donations:", error);
        res.status(500).send("Server Error");
    }
};


// Configure Email Transport
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS   // Your app password
    }
});

// Accept Donation Function
exports.acceptDonation = async (req, res) => {
    try {
        const { donationId } = req.params;
        const ngoId = req.session.userId;

        // Find the donation
        const donation = await Donation.findById(donationId).populate("donorId");
        if (!donation) return res.status(404).send("Donation not found");

        // Update status and NGO ID
        donation.status = "Accepted";
        donation.ngoId = ngoId;

        // Add notification for donor
        donation.notifications.push({
            message: `Your donation has been accepted by ${req.session.userName}`,
            read: false
        });

        await donation.save();

        // Send Email Notification to Donor
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: donation.donorId.email,
            subject: "Donation Accepted",
            text: `Hello ${donation.donorId.name}, your donation has been accepted by an NGO. They will collect it soon.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log("Email Error:", error);
            else console.log("Email Sent:", info.response);
        });

        res.redirect("/ngo/dashboard");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

