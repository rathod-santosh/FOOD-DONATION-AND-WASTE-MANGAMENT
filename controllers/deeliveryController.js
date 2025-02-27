const Donation = require("../models/donation");
const User = require("../models/user");
const Notification = require("../models/notification");

exports.deliveryDashboard = async (req, res) => {
  try {
    const [availableDonations, myDeliveries] = await Promise.all([
      Donation.find({ 
        'delivery.status': 'pending',
        'delivery.required': true
      }),
      Donation.find({
        'delivery.deliveryPartner': req.session.user._id,
        'delivery.status': { $nin: ['completed', 'cancelled'] }
      })
    ]);

    res.render("delivery/dashboard", {
      availableDonations,
      myDeliveries,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.redirect("/profile");
  }
};

exports.acceptDelivery = async (req, res) => {
  try {
    const donation = await Donation.findByIdAndUpdate(req.params.id, {
      'delivery.status': 'accepted',
      'delivery.deliveryPartner': req.session.user._id,
      'delivery.acceptedAt': new Date()
    });

    await Notification.create({
      userId: donation.donor,
      message: `Delivery accepted for donation ${donation._id}`
    });

    res.redirect("/delivery/dashboard");
  } catch (error) {
    console.error(error);
    res.redirect("/delivery/dashboard");
  }
};