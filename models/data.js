const mysql = require('mysql');

// Set up MySQL connection
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",  // Change this
    database: "food_donations"
});

connection.connect();

app.get("/profile", (req, res) => {
    if (!req.session.name) {
        return res.redirect('/signup');
    }

    const email = req.session.email;
    const query = `SELECT * FROM food_donations WHERE email = ?`;

    connection.query(query, [email], (err, results) => {
        if (err) throw err;

        res.render("profile", {
            name: req.session.name,
            email: req.session.email,
            gender: req.session.gender,
            donations: results
        });
    });
});
