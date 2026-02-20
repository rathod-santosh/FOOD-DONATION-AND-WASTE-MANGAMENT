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
mongoose.connect(mongoURI)
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

// Middleware to require specific roles
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    if (req.session.user.role !== role) {
      return res.status(403).send('Access denied: Insufficient permissions');
    }
    next();
  };
}

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
app.get("/ngo/donations", requireRole('NGO'), ngoDonationController.getPendingDonations);
app.post("/ngo/donations/update", requireRole('NGO'), ngoDonationController.updateDonationStatus);

// Fixed /ngo/dashboard route
app.get("/ngo/dashboard", requireRole('NGO'), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const donations = await Donation.find({ status: 'Accepted', acceptedBy: new mongoose.Types.ObjectId(req.session.user._id) });
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
    const { username, email, password, role, address } = req.body;
    if (await User.findOne({ email })) return res.send("Email already registered.");

    const newUser = new User({
      username,
      email,
      password,
      role: role || "user",
      address: address || ""
    });

    await newUser.save();
    res.redirect("/login");
  } catch (err) {
    console.error("Signup Error:", err);
    res.send("Error signing up.");
  }
});

// Contact form route
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'santoshrathod07111@gmail.com',
    subject: 'New Contact Form Submission',
    html: `
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    req.flash('success', 'Thank you for your inquiry! Your message has been successfully sent to our Food Donation support team.');
    res.redirect('/contact');
  } catch (err) {
    console.error('Error sending email:', err);
    req.flash('error', 'Error sending message. Please try again later.');
    res.redirect('/contact');
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

    // Role-based redirect
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

app.get("/donate", requireRole('user'), (req, res) => req.session.user ? res.render("donate", { name: req.session.user.username }) : res.redirect("/login"));

app.post("/donate", requireRole('user'), async (req, res) => {
  if (!req.session || !req.session.user) return res.redirect("/login");

  const { foodname, meal, category, quantity, name, phoneno, district, address, deliveryOption } = req.body;

  // Default to self_pickup if not provided
  const finalDeliveryOption = deliveryOption || "self_pickup";

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
    deliveryOption: finalDeliveryOption,
    deliveryFee: finalDeliveryOption === "paid_delivery" ? 50 : 0
  });

  try {
    await newDonation.save();
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
      dropLocation: deliveryMethod === 'assigned_delivery' ? dropLocation : null,
      deliveryStatus: deliveryMethod === 'assigned_delivery' ? 'pending_delivery' : 'not_assigned'
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
    }

    res.json({ success: true, message: 'Delivery method updated successfully!', pickupLocation, dropLocation, deliveryCharge });
  } catch (err) {
    console.error("❌ Error updating delivery method:", err);
    res.status(500).json({ success: false, message: 'Error updating delivery method' });
  }
});


app.post('/update-delivery/:id', async (req, res) => {
  try {
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
app.get('/delivery/pending', requireRole('DELIVERY'), async (req, res) => {
  try {
    const pendingDeliveries = await PendingDelivery.find({ status: 'pending' })
      .populate('donationId')  // Ensure you populate the related donation
      .lean();

    res.render('delivery/pending', { pendingDeliveries });
  } catch (err) {
    console.error("Error fetching pending deliveries:", err);
    res.status(500).send('Server Error');
  }
});


// Route to show accepted deliveries
app.get('/delivery/accepted', requireRole('DELIVERY'), async (req, res) => {
  try {
    const acceptedDeliveries = await AcceptedDelivery.find({ userId: new mongoose.Types.ObjectId(req.session.user._id) })
      .populate('donationId')
      .lean();

    res.render('delivery/accepted', { acceptedDeliveries });
  } catch (err) {
    console.error("Error fetching accepted deliveries:", err);
    res.status(500).send("Error fetching accepted deliveries.");
  }
});

// ✅ Route to accept a delivery
// ✅ Accept Delivery API Endpoint
app.post('/accept-delivery/:id', requireRole('DELIVERY'), async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const pendingDelivery = await PendingDelivery.findById(deliveryId).populate('donationId');

    if (!pendingDelivery) {
      console.error("❌ No PendingDelivery found for ID:", deliveryId);
      return res.status(404).json({ success: false, message: "Pending delivery not found." });
    }

    // ✅ Create Accepted Delivery Record
    const newAcceptedDelivery = new AcceptedDelivery({
      donationId: pendingDelivery.donationId._id,
      userId: req.session.user._id,
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

    await transporter.sendMail(donorMailOptions);

    res.redirect('/delivery/pending');

  } catch (err) {
    console.error("❌ Error accepting delivery:", err);
    res.redirect('/delivery/pending');
  }
});





app.get("/ngo/dashboard", requireRole('NGO'), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    // ✅ Fetch accepted donations not yet picked up by delivery
    const donations = await Donation.find({ status: 'Accepted', deliveryStatus: { $ne: 'accepted_delivery' } });

    const user = await User.findById(req.session.user._id);

    res.render("ngoDashboard", { user, donations });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("Server Error");
  }
});



// General Routes
app.get("/", (req, res) => res.render("index"));
app.get("/home", (req, res) => res.render("home"));
app.get("/about", (req, res) => res.render("about", { user: req.session.user || null }));
app.get("/contact", (req, res) => res.render("contact", { user: req.session.user || null }));

// Chatbot route
app.post('/chatbot', async (req, res) => {
  const { question } = req.body;
  console.log('Chatbot query received:', question);
  const lower = question.toLowerCase();
  let answer = "I'm sorry, I don't understand. Can you ask about donations, users, or deliveries?";

  try {
    if (lower.includes('how many donations') || lower.includes('number of donations') || lower.includes('total donations') || lower.includes('food donations') || lower.includes('donations count') || lower.includes('how many food donations') || lower.includes('number of food donations') || lower.includes('total food donations') || lower.includes('count of donations')) {
      const count = await Donation.countDocuments();
      console.log('Donations count:', count);
      answer = `There are currently ${count} donations in the system.`;
    } else if (lower.includes('how many users') || lower.includes('number of users') || lower.includes('total users') || lower.includes('registered users') || lower.includes('users count') || lower.includes('how many registered users') || lower.includes('number of registered users') || lower.includes('total registered users') || lower.includes('count of users') || lower.includes('users on platform') || lower.includes('platform users') || lower.includes('how many people') || lower.includes('number of people') || lower.includes('total people') || lower.includes('registered people')) {
      const count = await User.countDocuments();
      console.log('Users count:', count);
      answer = `There are currently ${count} users registered.`;
    } else if (lower.includes('how many ngos') || lower.includes('number of ngos') || lower.includes('total ngos') || lower.includes('registered ngos') || lower.includes('ngos count') || lower.includes('how many registered ngos') || lower.includes('number of registered ngos') || lower.includes('total registered ngos') || lower.includes('count of ngos') || lower.includes('organizations') || lower.includes('how many organizations') || lower.includes('number of organizations') || lower.includes('total organizations')) {
      const count = await User.countDocuments({ role: 'NGO' });
      console.log('NGOs count:', count);
      answer = `There are currently ${count} NGOs registered.`;
    } else if (lower.includes('how many delivery') || lower.includes('number of delivery') || lower.includes('total delivery') || lower.includes('delivery agents') || lower.includes('registered delivery') || lower.includes('delivery count') || lower.includes('how many delivery agents') || lower.includes('number of delivery agents') || lower.includes('total delivery agents') || lower.includes('count of delivery') || lower.includes('delivery personnel') || lower.includes('how many delivery personnel') || lower.includes('number of delivery personnel') || lower.includes('total delivery personnel')) {
      const count = await User.countDocuments({ role: 'DELIVERY' });
      console.log('Delivery agents count:', count);
      answer = `There are currently ${count} delivery agents registered.`;
    } else if (lower.includes('how many donors') || lower.includes('number of donors') || lower.includes('total donors') || lower.includes('registered donors') || lower.includes('donors count') || lower.includes('how many registered donors') || lower.includes('number of registered donors') || lower.includes('total registered donors') || lower.includes('count of donors')) {
      const count = await User.countDocuments({ role: { $ne: 'NGO', $ne: 'DELIVERY' } });
      console.log('Donors count:', count);
      answer = `There are currently ${count} donors registered.`;
    } else if (lower.includes('how many pending deliveries') || lower.includes('number of pending deliveries') || lower.includes('total pending deliveries') || lower.includes('pending deliveries') || lower.includes('unaccepted deliveries') || lower.includes('pending count') || lower.includes('how many pending') || lower.includes('number of pending') || lower.includes('total pending') || lower.includes('count of pending') || lower.includes('pending items') || lower.includes('pending requests') || lower.includes('how many pending requests') || lower.includes('number of pending requests') || lower.includes('total pending requests')) {
      const count = await PendingDelivery.countDocuments();
      console.log('Pending deliveries count:', count);
      answer = `There are currently ${count} pending deliveries.`;
    } else if (lower.includes('how many accepted deliveries') || lower.includes('number of accepted deliveries') || lower.includes('total accepted deliveries') || lower.includes('accepted deliveries') || lower.includes('completed deliveries') || lower.includes('accepted count') || lower.includes('how many accepted') || lower.includes('number of accepted') || lower.includes('total accepted') || lower.includes('count of accepted') || lower.includes('accepted items') || lower.includes('accepted requests') || lower.includes('how many accepted requests') || lower.includes('number of accepted requests') || lower.includes('total accepted requests') || lower.includes('request accepted') || lower.includes('accepted request')) {
      const count = await AcceptedDelivery.countDocuments();
      console.log('Accepted deliveries count:', count);
      answer = `There are currently ${count} accepted deliveries.`;
    } else if (lower.includes('user name') || lower.includes('names') || lower.includes('give user') || lower.includes('list user') || lower.includes('user list') || lower.includes('user details') || lower.includes('personal information') || lower.includes('user info')) {
      answer = "I'm sorry, I can't provide personal user information for privacy reasons.";
    } else if (lower.includes('location') || lower.includes('where') || lower.includes('food request location') || lower.includes('districts') || lower.includes('areas') || lower.includes('places') || lower.includes('locations for donations') || lower.includes('where to donate') || lower.includes('donation locations') || lower.includes('request locations') || lower.includes('food locations')) {
      const locations = await Donation.distinct('district');
      console.log('Locations:', locations);
      if (locations.length > 0) {
        answer = `Food requests are available in the following locations: ${locations.join(', ')}.`;
      } else {
        answer = "There are no food requests at the moment.";
      }
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('greetings') || lower.includes('good morning') || lower.includes('good afternoon') || lower.includes('good evening') || lower.includes('hi there') || lower.includes('hello there') || lower.includes('howdy')) {
      answer = "Hello! How can I help you with your food donation today?";
    } else if (lower.includes('donate') || lower.includes('donation') || lower.includes('food donation') || lower.includes('give food') || lower.includes('how to donate') || lower.includes('donate food') || lower.includes('make donation') || lower.includes('food contribution')) {
      answer = "To donate food, please visit our donate page and fill in the details. We accept various types of food items.";
    } else if (lower.includes('contact') || lower.includes('email') || lower.includes('phone') || lower.includes('call') || lower.includes('reach') || lower.includes('contact us') || lower.includes('get in touch') || lower.includes('contact info') || lower.includes('contact details')) {
      answer = "You can contact us via email at fooddonate@gmail.com or call us at 555-555-5555.";
    } else if (lower.includes('address') || lower.includes('location of office') || lower.includes('where are you') || lower.includes('office address') || lower.includes('company address')) {
      answer = "Our address is Thiagarajar College.";
    } else if (lower.includes('hours') || lower.includes('opening hours') || lower.includes('time') || lower.includes('working hours') || lower.includes('business hours')) {
      answer = "Our office hours are Monday to Friday, 9 AM to 5 PM.";
    } else if (lower.includes('expiration') || lower.includes('expiry') || lower.includes('expired') || lower.includes('food expiry') || lower.includes('donation expiry')) {
      answer = "We can't accept food near or past its expiration date for safety reasons.";
    } else if (lower.includes('help') || lower.includes('assist') || lower.includes('support') || lower.includes('can you help') || lower.includes('need help')) {
      answer = "I'm here to help! Ask me about donating, contacting us, or anything related to food donations.";
    } else if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('thanks') || lower.includes('thank you') || lower.includes('see you') || lower.includes('farewell')) {
      answer = "Goodbye! Thank you for your interest in food donation.";
    } else if (lower.includes('what is food donation') || lower.includes('about food donation') || lower.includes('food donation meaning')) {
      answer = "Food donation is the act of giving food to those in need through our platform. We help distribute food to NGOs and communities.";
    } else if (lower.includes('mission') || lower.includes('our mission') || lower.includes('goal') || lower.includes('purpose')) {
      answer = "Our mission is to reduce food waste and ensure no one goes hungry by facilitating food donations.";
    } else if (lower.includes('about') || lower.includes('about us') || lower.includes('who are you') || lower.includes('what is this platform')) {
      answer = "We are a food donation platform connecting donors with NGOs to reduce food waste and help those in need.";
    } else if (lower.includes('home') || lower.includes('home page') || lower.includes('main page')) {
      answer = "The home page is the main landing page of our food donation platform, introducing our services.";
    } else if (lower.includes('profile') || lower.includes('user profile') || lower.includes('my account')) {
      answer = "The profile page displays your personal information, donation history, and notifications.";
    } else if (lower.includes('donate page') || lower.includes('donation page') || lower.includes('how to donate page')) {
      answer = "The donate page lets you submit food donation requests with details like food type, quantity, and location.";
    } else if (lower.includes('dashboard') || lower.includes('ngo dashboard') || lower.includes('delivery dashboard')) {
      answer = "For NGOs, the dashboard shows accepted donations for management. For delivery personnel, it shows pending and accepted deliveries.";
    } else if (lower.includes('contact page') || lower.includes('contact us page')) {
      answer = "The contact page has our contact details and this chatbot for help.";
    } else if (lower.includes('ngo') || lower.includes('how ngos use') || lower.includes('ngo role')) {
      answer = "NGOs use the platform to view and manage food donations, accepting and assigning deliveries.";
    } else if (lower.includes('delivery') || lower.includes('delivery role') || lower.includes('delivery personnel')) {
      answer = "Delivery personnel handle the logistics of picking up and delivering food donations to recipients.";
    } else if (lower.includes('login') || lower.includes('sign in') || lower.includes('log in')) {
      answer = "Use the login page to sign in with your email and password based on your role.";
    } else if (lower.includes('signup') || lower.includes('register') || lower.includes('sign up') || lower.includes('create account')) {
      answer = "The signup page allows new users to register as donors, NGOs, or delivery personnel.";
    } else if (lower.includes('logout') || lower.includes('sign out') || lower.includes('log out')) {
      answer = "Click logout to securely end your session.";
    } else if (lower.includes('pending deliveries') || lower.includes('pending page') || lower.includes('pending dashboard')) {
      answer = "For delivery personnel, the pending deliveries page shows assignments waiting to be accepted.";
    } else if (lower.includes('accepted deliveries') || lower.includes('accepted page') || lower.includes('accepted dashboard')) {
      answer = "For delivery personnel, the accepted deliveries page shows completed or in-progress deliveries.";
    } else if (lower.includes('donations') || lower.includes('ngo donations') || lower.includes('donation list')) {
      answer = "For NGOs, the donations page lists all submitted donations for review and acceptance.";
    } else if (lower.includes('notifications') || lower.includes('notification') || lower.includes('updates')) {
      answer = "The notifications feature keeps you updated on donation status, delivery updates, and more.";
    }
  } catch (err) {
    console.error('Error in chatbot:', err);
    answer = "Sorry, I couldn't fetch the data right now.";
  }

  console.log('Chatbot answer:', answer);
  res.json({ answer });
});

// 404 Page
app.use((req, res) => res.status(404).render("404"));

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
