


require('dotenv').config(); // Load environment variables first

const express = require("express");
const path = require("path");
const flash = require('connect-flash');
const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const bodyParser = require('body-parser');

const User = require("./models/user");
const Donation = require("./models/donation");
const Notification = require("./models/notification");
const Delivery = require("./models/delivery");


const PendingDelivery = require('./models/PendingDelivery');  // Adjust path as needed
// const AcceptedDelivery = require('./models/AcceptedDelivery'); // If needed




const app = express();
const PORT = 4000;

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/food";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Set EJS as the template engine
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/img", express.static(path.join(__dirname, "img")));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // For development
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Middleware to pass user data to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const ngoDonationController = require("./controllers/ngoDonation");
const userController = require("./controllers/userController");
const donation = require('./models/donation');

// NGO Routes
app.get("/ngo/donations", ngoDonationController.getPendingDonations);
app.post("/ngo/donations/update", ngoDonationController.updateDonationStatus);
app.get("/ngo/dashboard", ngoDonationController.getAcceptedDonations);

// User Routes
app.get("/user/donations", userController.getUserDonations);



app.post('/ngo/donations/update', async (req, res) => {
  try {
      const { donationId, status, deliveryMethod, deliveryCharge } = req.body;

      let updateData = { status };

      // If assigned delivery is selected, move to the delivery role's Pending Deliveries
      if (deliveryMethod === 'assigned_delivery') {
          updateData.deliveryMethod = 'assigned_delivery';
          updateData.deliveryCharge = deliveryCharge;

          // Move the donation to the Pending Deliveries for delivery role
          await PendingDelivery.create({
              donationId,
              deliveryCharge,
              status: 'Pending'
          });
      }

      // Update the donation
      await Donation.findByIdAndUpdate(donationId, updateData);

      // Get updated pending deliveries count for delivery role
      const deliveryPendingCount = await PendingDelivery.countDocuments({ status: 'Pending' });

      // Send JSON response to update UI dynamically
      res.json({ success: true, deliveryPendingCount });

  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to update donation status.' });
  }
});



app.use(flash());

// Middleware to pass flash messages to views
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});




// General Routes
app.get("/", (req, res) => res.render("index"));
app.get("/home", (req, res) => res.render("home"));
app.get("/about", (req, res) => res.render("about", { user: req.session.user || null }));
app.get("/contact", (req, res) => res.render("contact", { user: req.session.user || null }));

// Signup Route
app.get("/signup", (req, res) => {
  res.render("signup", { role: req.query.role || "user" });
});
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.send("Email already registered.");
    await new User({ username, email, password, role: role || "user" }).save();
    res.redirect("/login");
  } catch (err) {
    console.error("Signup Error:", err);
    res.send("Error signing up.");
  }
});

// Login Route
app.get("/login", (req, res) => res.render("login"));
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) return res.send("Invalid email or password");
    req.session.user = { _id: user._id, username: user.username, email: user.email, role: user.role };
    res.redirect("/home");
  } catch (err) {
    console.error("Login Error:", err);
    res.send("Error logging in.");
  }
});

// Logout Route
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

// Profile Route
app.get("/profile", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    const data = req.session.user.role === "ngo"
      ? { donations: await Donation.find() }
      : { donations: await Donation.find({ email: req.session.user.email }), notifications: await Notification.find({ userId: req.session.user._id }).sort({ createdAt: -1 }) };
    res.render("profile", { user: req.session.user, ...data });
  } catch (err) {
    console.error(err);
    res.send("Error fetching data");
  }
});

// Donate Routes
app.get("/donate", (req, res) => req.session.user ? res.render("donate", { name: req.session.user.username }) : res.redirect("/login"));
app.post("/donate", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    await new Donation({ ...req.body, email: req.session.user.email }).save();
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.send("Error saving donation.");
  }
});








const ensureDeliveryRole = (req, res, next) => {
  if (req.session.user?.role === 'Delivery') return next();
  req.flash('error', 'Access denied - Delivery role required');
  res.redirect('/login');
};

// NGO Updates Delivery Method
app.post('/update-delivery-method/:donationId', async (req, res) => {
  const { donationId } = req.params;
  const { deliveryMethod, deliveryCharge } = req.body;

  try {
      // Validate delivery method
      if (!deliveryMethod || !['self_pickup', 'assigned_delivery'].includes(deliveryMethod)) {
          req.flash('error', 'Invalid delivery method');
          return res.redirect('/ngo/dashboard');
      }

      // Validate user session
      if (!req.session.user?.role === 'NGO') {
          req.flash('error', 'Unauthorized access');
          return res.redirect('/login');
      }

      // Update donation
      const updatedDonation = await Donation.findByIdAndUpdate(
          donationId,
          {
              deliveryMethod,
              status: deliveryMethod === 'assigned_delivery' ? 'pending_delivery' : 'accepted',
              deliveryCharge: deliveryMethod === 'assigned_delivery' ? Number(deliveryCharge) : null,
              ngo: req.session.user._id
          },
          { new: true, runValidators: true }
      );

      // Create notification with safe handling
      await Notification.create({
          userId: updatedDonation.email,
          message: `Delivery method set to: ${deliveryMethod.replace('_', ' ')}`,
          donation: donationId
      });

      req.flash('success', 'Delivery method updated successfully');
      res.redirect('/ngo/dashboard');

  } catch (err) {
      console.error('Update error:', err);
      req.flash('error', 'Error updating delivery method');
      res.redirect('/ngo/dashboard');
  }
});


app.post('/update-delivery/:id', async (req, res) => {
  try {
      console.log("🔄 Updating delivery:", req.params.id);

      if (!req.session.user) {
          return res.status(401).json({ success: false, message: "Unauthorized: Please log in first." });
      }

      // Find the delivery request by ID
      let delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
          return res.status(404).json({ success: false, message: "Delivery not found." });
      }

      // ✅ Update the delivery status from "pending" to "accepted"
      delivery.status = "pending"; // Move to pending section
      delivery.assignedTo = null; // Ensure it is unassigned
      await delivery.save();

      console.log("✅ Delivery updated successfully:", delivery);
      res.json({ success: true, message: "Delivery successfully updated!" });

  } catch (error) {
      console.error("❌ Error updating delivery:", error);
      res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});


app.get('/delivery/pending', async (req, res) => {
  try {
      const pendingDeliveries = await Donation.find({
          status: 'pending_delivery',
          deliveryMethod: 'assigned_delivery',
          ngo: { $exists: true, $ne: null }
      })
      .populate('ngo', 'address')
      .lean(); // Add for better performance

      console.log('Pending Deliveries Query:', pendingDeliveries); // Debug log
      
      res.render('delivery/pending', { pendingDeliveries });
  } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching pending deliveries.");
  }
});



// Accept a Delivery
app.post('/accept-delivery/:id', async (req, res) => {
  await Delivery.findByIdAndUpdate(req.params.id, { status: 'accepted', assignedTo: req.session.user._id });
  res.redirect('/delivery/pending');
});


// View Accepted Deliveries
app.get('/accepted-deliveries', async (req, res) => {
  res.render('accepted_deliveries', { 
      acceptedDeliveries: await Delivery.find({ status: 'accepted', assignedTo: req.session.user._id }), 
      user: req.session.user 
  });
});

// Complete a Delivery
app.post('/complete-delivery/:id', async (req, res) => {
  await Delivery.findByIdAndUpdate(req.params.id, { status: 'completed' });
  res.redirect('/accepted-deliveries');
});


// 404 Page
app.use((req, res) => res.status(404).render("404"));

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 



// mongoose.model


donation

const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
    foodname: String,
    meal: String,
    category: String,
    quantity: String,
    name: String,
    phoneno: String,
    district: String,
    address: String,
    email: String,

    status: { 
        type: String, 
        enum: ["Pending", "Accepted", "Collected", "pending_delivery", "in_transit", "Delivered"], 
        default: "Pending" 
    },

    notifications: {
      type: [{
          message: String,
          date: { type: Date, default: Date.now }
      }],
      default: [] // Add default empty array
  },

    deliveryMethod: {
        type: String,
        enum: ['self_pickup', 'assigned_delivery'],
        default: 'self_pickup'
    },
    deliveryCharge: Number,
    ngo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.deliveryMethod === 'assigned_delivery';
        }
    },
    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Donation", donationSchema);



























<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NGO Dashboard</title>
    <link rel="stylesheet" href="/css/ngoDashboard.css">
</head>
<body>

    <div class="dashboard-container">
        <h2>Welcome, <%= user.username %> ✅</h2>
        <p><strong>Email:</strong> <%= user.email %></p>
        <p><strong>Role:</strong> <%= user.role %></p>

        <h3>Accepted Donations 📦</h3>

        <% if (donations.length > 0) { %>
            <table class="donations-table">
                <thead>
                    <tr>
                        <th>Food Name</th>
                        <th>Quantity</th>
                        <th>Category</th>
                        <th>District</th>
                        <th>Date</th>
                        <th>Delivery Method</th>
                        <th>Delivery Charge</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <% donations.forEach(donation => { %>
                        <tr>
                            <td><%= donation.foodname %></td>
                            <td><%= donation.quantity %></td>
                            <td><%= donation.category %></td>
                            <td><%= donation.district %></td>
                            <td><%= new Date(donation.createdAt).toLocaleDateString() %></td>
                            <td>
                                <form class="update-form" data-id="<%= donation._id %>">
                                    <select name="deliveryMethod" class="delivery-method" data-id="<%= donation._id %>">
                                        <option value="self_pickup" <%= donation.deliveryMethod === 'self_pickup' ? 'selected' : '' %>>Self Pickup</option>
                                        <option value="assigned_delivery" <%= donation.deliveryMethod === 'assigned_delivery' ? 'selected' : '' %>>Assigned Delivery</option>
                                    </select>
                                    <input type="number" name="deliveryCharge" class="delivery-charge" data-id="<%= donation._id %>" 
                                        placeholder="Enter Charge" value="<%= donation.deliveryCharge || '' %>" 
                                        style="display: <%= donation.deliveryMethod === 'assigned_delivery' ? 'block' : 'none' %>;">
                                    <button type="submit" class="btn btn-primary">Update</button>
                                </form>
                            </td>
                            <td><%= donation.deliveryMethod === 'assigned_delivery' ? `₹${donation.deliveryCharge}` : 'N/A' %></td>
                        </tr>
                    <% }) %>
                </tbody>
            </table>
        <% } else { %>
            <p class="no-donations">No accepted donations yet.</p>
        <% } %>

    </div>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            // Show/hide delivery charge input
            document.querySelectorAll('.delivery-method').forEach(select => {
                select.addEventListener('change', function() {
                    const chargeField = document.querySelector(`.delivery-charge[data-id="${this.dataset.id}"]`);
                    chargeField.style.display = this.value === 'assigned_delivery' ? 'block' : 'none';
                });
            });
        
            // Handle form submissions
            document.querySelectorAll('.update-form').forEach(form => {
                form.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    
                    const formData = new FormData(this);
                    const donationId = this.dataset.id;
                    const deliveryMethod = formData.get('deliveryMethod');
                    const deliveryCharge = formData.get('deliveryCharge');
        
                    // Client-side validation
                    if (!deliveryMethod) {
                        alert('Please select a delivery method');
                        return;
                    }
        
                    if (deliveryMethod === 'assigned_delivery' && !deliveryCharge) {
                        alert('Please enter a delivery charge');
                        return;
                    }
        
                    try {
                        const response = await fetch(`/update-delivery-method/${donationId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams(formData)
                        });
        
                        if (response.redirected) {
                            window.location.href = response.url;
                            return;
                        }
        
                        const result = await response.json();
                        
                        if (result.success) {
                            // Update UI dynamically
                            const row = this.closest('tr');
                            // Update delivery method display
                            row.querySelector('td:nth-child(6)').textContent = 
                                deliveryMethod === 'assigned_delivery' 
                                    ? `₹${deliveryCharge}` 
                                    : 'N/A';
                            
                            // Show success feedback
                            alert('Delivery method updated successfully! ✅');
                            
                            // Refresh pending deliveries if needed
                            if (deliveryMethod === 'assigned_delivery') {
                                fetchPendingDeliveries();
                            }
                        } else {
                            alert('Error updating delivery method! ❌');
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        alert('Server error! Please try again.');
                    }
                });
            });
        
            // Function to refresh pending deliveries
            async function fetchPendingDeliveries() {
                try {
                    const response = await fetch('/delivery/pending');
                    const text = await response.text();
                    
                    // Update only if user is on delivery page
                    if (document.querySelector('.pending-deliveries-section')) {
                        document.querySelector('.pending-deliveries-section').innerHTML = text;
                    }
                } catch (error) {
                    console.error("Error fetching pending deliveries:", error);
                }
            }
        });
        </script>

</body>
</html>
