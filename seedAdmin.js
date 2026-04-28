// seedAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config(); // Just require it, no need to assign

const MONGODB_URI =
  process.env.MONGO || "mongodb://localhost:27017/gigantic_tours_careers";

async function seedAdmin() {
  try {
    // Connect once (remove the duplicate connect at the top)
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: "admin@gigantictours.com",
    });
    if (existingAdmin) {
      console.log("Admin user already exists!");
      process.exit(0);
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    const admin = new User({
      email: "admin@gigantictours.com",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();
    console.log("✅ Admin user created successfully!");
    console.log("Email: admin@gigantictours.com");
    console.log("Password: admin123");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
