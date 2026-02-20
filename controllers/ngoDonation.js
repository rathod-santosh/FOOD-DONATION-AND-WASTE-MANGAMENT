const Donation = require('../models/donation'); // Assuming Donation model exists
// Add at the top of the file
const Notification = require("../models/notification");
const User = require("../models/user");

const transporter = require("../config/emailConfig");

// Controller to view donations for the NGO
module.exports.viewDonations = (req, res) => {
    // You can query the donations from the database
    Donation.find()
        .then((donations) => {
            // Render the donations view, passing the donations data
            res.render('ngoDonations', { donations });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('Server Error');
        });
};





// Display only "Pending" donations for NGOs
exports.getPendingDonations = async (req, res) => {
    try {
        const donations = await Donation.find({ status: "Pending" });
        res.render("ngoDonations", { donations });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

// Handle donation status update (Accept request)
exports.updateDonationStatus = async (req, res) => {
    try {
        const { donationId, status } = req.body;

        // ✅ Check if required parameters are provided
        if (!donationId || !status) {
            return res.status(400).json({ success: false, message: "Missing required parameters." });
        }

        // ✅ Find the donation
        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found." });
        }

        // ✅ Update donation status
        donation.status = status;

        // ✅ Ensure notifications array exists before pushing
        if (!donation.notifications) {
            donation.notifications = [];
        }

        // ✅ Handle "Accepted" status updates
        if (status === "Accepted") {
            const acceptingUser = req.session.user; // ✅ Ensure user session exists

            // ✅ Set acceptedBy to the NGO's user ID
            donation.acceptedBy = acceptingUser._id;

            // ✅ Add notification to donation
            donation.notifications.push({
                message: `Accepted by ${acceptingUser.username}`,
                date: new Date()
            });

            try {
                // ✅ Find the donor user
                const donor = await User.findOne({ email: donation.email });

                if (donor) {
                    // ✅ Create a notification for the donor
                    const notification = new Notification({
                        userId: donor._id,
                        message: `Your ${donation.foodname} donation was accepted by ${acceptingUser.username}`
                    });
                    await notification.save();
                }

                // ✅ Send an email notification to the donor
                const mailOptions = {
                    from: `"Food Donation Team" <${process.env.EMAIL_USER}>`,
                    to: donation.email,
                    subject: "🎉 Donation Accepted! NGO Will Contact You Soon",
                    html: `
                        <div style="max-width: 600px; margin: 20px auto; font-family: Arial, sans-serif;">
                            <div style="background: #4CAF50; padding: 20px; color: white;">
                                <h1 style="margin: 0;">Thank You for Your Donation!</h1>
                            </div>
                            
                            <div style="padding: 20px; border: 1px solid #ddd;">
                                <p>Hello ${donation.name},</p>
                                <p>We're excited to let you know that your donation has been accepted!</p>

                                <div style="background: #f8f9fa; padding: 15px; margin: 20px 0;">
                                    <h3 style="margin-top: 0;">Donation Details:</h3>
                                    <ul>
                                        <li><strong>Food Type:</strong> ${donation.foodname}</li>
                                        <li><strong>Quantity:</strong> ${donation.quantity}</li>
                                        <li><strong>Accepted By:</strong> ${acceptingUser.username}</li>
                                    </ul>
                                </div>

                                <p>📞 <strong>NGO Contact Details:</strong></p>
                                <p>
                                    ${acceptingUser.username}<br>
                                    Phone: ${acceptingUser.phone || 'Contact details will be shared soon'}
                                </p>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="http://localhost:4000/profile" 
                                       style="background: #4CAF50; color: white; padding: 12px 25px; 
                                              text-decoration: none; border-radius: 5px;">
                                        View Donation Status
                                    </a>
                                </div>

                                <p style="color: #666; font-size: 0.9em;">
                                    You're receiving this email because you created a donation on Food Donation App.
                                    <br>
                                    <a href="#" style="color: #4CAF50;">Unsubscribe from notifications</a>
                                </p>
                            </div>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("❌ Email notification error:", emailError);
            }
        }

        // ✅ Save the updated donation
        await donation.save();

        res.redirect("/ngo/donations");

    } catch (error) {
        console.error("❌ Update error:", error);
        res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
};


// Display only "Accepted" donations on NGO Dashboard
// controllers/ngoDonation.js
exports.getAcceptedDonations = async (req, res) => {
    try {
        const donations = await Donation.find({
            status: 'accepted',
            ngo: req.session.user._id
        });
        res.render('ngoDashboard', { user: req.session.user, donations });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};




