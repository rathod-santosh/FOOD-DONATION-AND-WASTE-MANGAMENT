exports.getAcceptedDonations = async (req, res) => {
    try {
        const ngoId = req.user._id; // Get logged-in NGO's ID
        const donations = await Donation.find({ status: "Accepted", acceptedBy: ngoId });

        res.render("ngoDashboard", { donations });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};
