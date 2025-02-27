const isAuthenticatedNGO = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === "NGO") {
        return next();
    }
    res.redirect("/login"); // Redirect unauthorized users
};

module.exports = isAuthenticatedNGO;
