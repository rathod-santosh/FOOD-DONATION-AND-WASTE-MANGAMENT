// Assigns a delivery person to a donation.

const Delivery = require("../models/delivery");
const Donation = require("../models/donation");

exports.assignDelivery = async (req, res) => {
    const { donationId, deliveryPersonId } = req.body;

    try {
        const donation = await Donation.findById(donationId);
        if (donation.deliveryOption !== "Delivery Service") {
            return res.status(400).send("Delivery is not required for this donation.");
        }

        const newDelivery = new Delivery({
            donationId,
            deliveryPersonId,
            status: "Pending",
        });

        await newDelivery.save();
        res.redirect("/delivery-dashboard");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error assigning delivery.");
    }
};
