const Notification = require("../models/notification");

router.get("/notifications", async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id, isRead: false });
        res.render("dashboard", { notifications });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
