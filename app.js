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
const PendingDelivery = require('./models/PendingDelivery');  
const AcceptedDelivery = require('./models/AcceptedDelivery');


//new
// const DeliveryNotification = require("./models/DeliveryNotification"); // ✅ Import the new model


const app = express();
const PORT = 4000;

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/food";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Set EJS as the template engine
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use(express.static(path.join(__dirname, "views")));

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
app.use(async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user._id);
      res.locals.user = user; // Ensures user data is always available
    } catch (err) {
      console.error("User fetch error:", err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Flash messages middleware
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

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

// NGO Routes
app.get("/ngo/donations", ngoDonationController.getPendingDonations);
app.post("/ngo/donations/update", ngoDonationController.updateDonationStatus);

// Fixed /ngo/dashboard route
app.get("/ngo/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login"); 

  try {
    const donations = await Donation.find({ status: 'Accepted' });
    const user = await User.findById(req.session.user._id);
    
    res.render("ngoDashboard", { user, donations });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("Server Error");
  }
});

// User Routes
app.get("/user/donations", userController.getUserDonations);

// Signup Route
app.get("/signup", (req, res) => res.render("signup", { role: req.query.role || "user" }));
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

// Profile Route (MongoDB for Donations)
app.get("/profile", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
      let data = {
          donations: [],
          notifications: []
      };

      if (req.session.user.role === "ngo") {
          data.donations = await Donation.find();
      } else {
          data.donations = await Donation.find({ email: req.session.user.email });
          data.notifications = await Notification.find({ 
              userId: req.session.user._id 
          }).sort({ createdAt: -1 });
      }

      res.render("profile", { 
          user: req.session.user, 
          ...data 
      });
  } catch (err) {
      console.error(err);
      res.send("Error fetching data");
  }
});

app.get("/donate", (req, res) => req.session.user ? res.render("donate", { name: req.session.user.username }) : res.redirect("/login"));

app.post("/donate", async (req, res) => {
  if (!req.session || !req.session.user) return res.redirect("/login");

  const { foodname, meal, category, quantity, name, phoneno, district, address, deliveryOption } = req.body;

  if (!deliveryOption) {
      return res.send("Error: Delivery option is required.");
  }

  const newDonation = new Donation({
      foodname,
      meal,
      category,
      quantity,
      name,
      phoneno,
      district,
      address,
      email: req.session.user.email,
      deliveryOption,
      deliveryFee: deliveryOption === "paid_delivery" ? 50 : 0
  });

  try {
      await newDonation.save();
      console.log("New donation saved:", newDonation);
      res.redirect("/profile");
  } catch (err) {
      console.error("Error saving donation:", err);
      res.send("Error saving donation.");
  }
});









const deliveryRoutes = require('./routes/delivery');
const notificationRoutes = require('./routes/notifications');


// delivery related 



app.post('/ngo/donations/update', async (req, res) => {
  try {
      const { donationId, status, deliveryMethod, deliveryCharge } = req.body;

      let updateData = { status };

      // Ensure the delivery method and status are properly updated
      if (deliveryMethod === 'assigned_delivery') {
          updateData.deliveryMethod = 'assigned_delivery';
          updateData.deliveryCharge = deliveryCharge;

          // Move the donation to the Pending Deliveries for delivery role
          await PendingDelivery.create({
              donationId,
              deliveryCharge,
              status: 'pending'
          });
      }

      // Update the donation
      await Donation.findByIdAndUpdate(donationId, updateData);

      // Get updated pending deliveries count for delivery role
      const deliveryPendingCount = await PendingDelivery.countDocuments({ status: 'pending' });

      // Send JSON response to update UI dynamically
      res.json({ success: true, deliveryPendingCount });

  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Failed to update donation status.' });
  }
});


app.post('/update-delivery-method/:donationId', async (req, res) => {
  try {
    const { donationId } = req.params;
    const { deliveryMethod, deliveryCharge, pickupLocation, dropLocation } = req.body;

    // ✅ Debug: Log received data
    console.log("📌 Received Data from Frontend:", { deliveryMethod, deliveryCharge, pickupLocation, dropLocation });

    // ✅ Check if required fields are provided
    if (deliveryMethod === 'assigned_delivery' && (!pickupLocation || !dropLocation)) {
      console.error("❌ Missing Pickup or Drop Location in Request");
      return res.status(400).json({ success: false, message: "Pickup and Drop locations are required." });
    }

    // ✅ Update delivery details in the Donation model
    await Donation.findByIdAndUpdate(donationId, {
      deliveryMethod,
      deliveryCharge: deliveryMethod === 'assigned_delivery' ? deliveryCharge : null,
      pickupLocation: deliveryMethod === 'assigned_delivery' ? pickupLocation : null,
      dropLocation: deliveryMethod === 'assigned_delivery' ? dropLocation : null
    });

    // ✅ Ensure PendingDelivery gets correct pickup & drop locations
    if (deliveryMethod === 'assigned_delivery') {
      const newPendingDelivery = await PendingDelivery.create({
        donationId,
        deliveryCharge,
        pickupLocation,
        dropLocation,
        status: 'pending'
      });

      console.log("✅ New Pending Delivery Created:", newPendingDelivery);
    }

    res.json({ success: true, message: 'Delivery method updated successfully!', pickupLocation, dropLocation, deliveryCharge });
  } catch (err) {
    console.error("❌ Error updating delivery method:", err);
    res.status(500).json({ success: false, message: 'Error updating delivery method' });
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


// app.get('/delivery/pending', async (req, res) => {
//   try {
//       const pendingDeliveries = await Donation.find({ status: 'pending_delivery' })
//           .populate('ngo', 'address')
//           .lean();

//       res.render('delivery/pending', { pendingDeliveries });  // ✅ Ensure the correct folder is used
//   } catch (err) {
//       console.error("Error fetching pending deliveries:", err);
//       res.status(500).send("Error fetching pending deliveries.");
//   }
// });



// Accept a Delivery

// ✅ Route: Pending Deliveries
// app.get('/pending-deliveries', async (req, res) => {
//   try {
//     const pendingDeliveries = await Delivery.find({ status: 'pending' });
//     res.render('pending', { pendingDeliveries, user: req.session.user });
//   } catch (error) {
//     console.error("Error fetching pending deliveries:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });

// ✅ Route: Accept Delivery
// Accept a Delivery
// Require Login Middleware
// Require Login Middleware
// ✅ Route to show pending deliveries
app.get('/delivery/pending', async (req, res) => {
  try {
    const pendingDeliveries = await PendingDelivery.find({ status: 'pending' })
      .populate('donationId')  // Ensure you populate the related donation
      .lean();

      console.log(pendingDeliveries);  // ✅ Debugging: Check if data is coming

    res.render('delivery/pending', { pendingDeliveries });
  } catch (err) {
    console.error("Error fetching pending deliveries:", err);
    res.status(500).send('Server Error');
  }
});


// ✅ Route to show accepted deliveries
app.get('/delivery/accepted', async (req, res) => {
  try {
    const acceptedDeliveries = await AcceptedDelivery.find()
      .populate('donationId')  // Populate food details
      .lean();

    res.render('delivery/accepted', { acceptedDeliveries });
  } catch (err) {
    console.error("Error fetching accepted deliveries:", err);
    res.status(500).send("Error fetching accepted deliveries.");
  }
});

// ✅ Route to accept a delivery
// ✅ Accept Delivery API Endpoint
app.post('/accept-delivery/:id', async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const pendingDelivery = await PendingDelivery.findById(deliveryId).populate('donationId');

    if (!pendingDelivery) {
      return res.status(404).json({ success: false, message: "Pending delivery not found." });
    }

   // ✅ Create Accepted Delivery Record
const newAcceptedDelivery = new AcceptedDelivery({
  donationId: pendingDelivery.donationId._id,
  deliveryCharge: pendingDelivery.deliveryCharge,
  pickupLocation: pendingDelivery.pickupLocation,
  dropLocation: pendingDelivery.dropLocation,
  status: "accepted_delivery",
  foodname: pendingDelivery.donationId.foodname,   // ✅ Add food name
  quantity: pendingDelivery.donationId.quantity,   // ✅ Add quantity
  donorEmail: pendingDelivery.donationId.donorEmail // ✅ Add donor email
});


    await newAcceptedDelivery.save();
    await Donation.findByIdAndUpdate(pendingDelivery.donationId._id, { deliveryStatus: "accepted_delivery" });
    await PendingDelivery.findByIdAndDelete(deliveryId);

    // 🔹 Get Donor Email from Donation Details
    const donorEmail = pendingDelivery.donationId.email;

    // 🔹 NGO Email (Replace with actual NGO email)
    const ngoEmail = "vishwatej.kumbhar22@pccoepune.org";

    // ✅ Email to NGO
    const ngoMailOptions = {
      from: 'rathodsanty43@gmail.com',
      to: ngoEmail,
      subject: '🚚 Delivery Accepted - Action Required',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #007BFF;">📢 Delivery Accepted</h2>
          <p>Hello,</p>
          <p>We are pleased to inform you that a delivery has been successfully <strong>accepted</strong>. Below are the details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>📧 NGO Email:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${ngoEmail}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>🍛 Food Name:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.donationId.foodname || 'N/A'}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>📦 Quantity:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.donationId.quantity || 'N/A'}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>📍 Pickup Location:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.pickupLocation}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>🎯 Drop Location:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.dropLocation}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>💰 Delivery Charge:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">₹${pendingDelivery.deliveryCharge}</td>
  </tr>
</table>


          <p>Please log in to your <a href="http://yourwebsite.com/ngo/dashboard" style="color: #007BFF; text-decoration: none;">NGO Dashboard</a> to review and take necessary action.</p>

          <p>Thank you for your dedication to making a difference! 💙</p>

          <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated notification from the Food Donation Platform.</p>
        </div>
      `
    };

    // ✅ Email to Donor
    const donorMailOptions = {
      from: 'rathodsanty43@gmail.com',
      to: donorEmail,
      subject: '🎉 Your Donation is On the Way!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #28a745;">Your Donation is Now Being Delivered 🚛</h2>
          <p>Dear Donor,</p>
          <p>Your generous donation is now on the way to make a difference! A delivery partner has accepted the request and will ensure safe transportation.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>📧 NGO Email:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${ngoEmail}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>🍛 Food Name:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.donationId.foodname || 'N/A'}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>📦 Quantity:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.donationId.quantity || 'N/A'}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>📍 Pickup Location:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.pickupLocation}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>🎯 Drop Location:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${pendingDelivery.dropLocation}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>💰 Delivery Charge:</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">₹${pendingDelivery.deliveryCharge}</td>
  </tr>
</table>


          <p>Thank you for your kindness and generosity! ❤️</p>
          <p style="font-style: italic;">If you have any questions, feel free to reach out to us.</p>

          <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated notification from the Food Donation Platform.</p>
        </div>
      `
    };

    // ✅ Send both emails asynchronously
    await transporter.sendMail(ngoMailOptions);
    console.log("✅ Email sent to NGO:", ngoEmail);

    await transporter.sendMail(donorMailOptions);
    console.log("✅ Email sent to Donor:", donorEmail);

    res.json({ success: true, message: "Delivery accepted successfully!", deliveryId });

  } catch (err) {
    // console.error("❌ Error accepting delivery:", err);
    // res.status(500).json({ success: false, message: "Error accepting delivery." });
  }
});





app.get("/ngo/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login"); 

  try {
    // ✅ Fetch only accepted donations for the NGO dashboard
    const donations = await Donation.find({ deliveryStatus: { $in: ['pending_delivery', 'accepted_delivery'] } });

    const user = await User.findById(req.session.user._id);
    
    res.render("ngoDashboard", { user, donations });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("Server Error");
  }
});


app.get('/delivery/accepted', async (req, res) => {
  try {
    const acceptedDeliveries = await AcceptedDelivery.find({ status: "accepted_delivery" })
      .populate('donationId')
      .lean();

    console.log("📌 All Accepted Deliveries:", acceptedDeliveries); // 🔹 Debugging Line

    res.render('delivery/accepted', { acceptedDeliveries });
  } catch (err) {
    console.error("Error fetching accepted deliveries:", err);
    res.status(500).send("Error fetching accepted deliveries.");
  }
});










// General Routes
app.get("/", (req, res) => res.render("index"));
app.get("/home", (req, res) => res.render("home"));
app.get("/about", (req, res) => res.render("about", { user: req.session.user || null }));
app.get("/contact", (req, res) => res.render("contact", { user: req.session.user || null }));

// 404 Page
app.use((req, res) => res.status(404).render("404"));

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
