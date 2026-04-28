const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv").config();
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const applicantRouter = require("./routes/applicants");
const authRouter = require("./routes/auth");
const interviewsRouter = require("./routes/interveiws");
const jobsRouter = require("./routes/jobs");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("MongoDB connected successfully");
    createDefaultAdmin();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Admin Seeding Function
async function createDefaultAdmin() {
  try {
    const User = require("./models/User");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@company.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("ℹ  Admin account already exists");
      return;
    }

    // Hash password before creating user (bypasses pre-save hook issues)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create admin directly with hashed password
    // Using { validateBeforeSave: false } to skip any problematic hooks
    const admin = new User({
      name: "System Administrator",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    // Save without running pre-save hooks (prevents double-hashing / next() errors)
    await User.collection.insertOne({
      name: admin.name,
      email: admin.email,
      password: admin.password,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 🔐 Log credentials ONCE on creation
    console.log("========================================");
    console.log("✅  ADMIN ACCOUNT CREATED SUCCESSFULLY");
    console.log("========================================");
    console.log(`📧  Email:    ${adminEmail}`);
    console.log(`🔑  Password: ${adminPassword}`);
    console.log(`👤  Role:     admin`);
    console.log("========================================");
    console.log("⚠️  IMPORTANT: Change default password after first login!");
    console.log("========================================");
  } catch (error) {
    console.error("❌ Error creating admin account:", error.message);
  }
}

// Basic Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Import and use routes
app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/applicants", applicantRouter);
app.use("/api/interviews", interviewsRouter);

// After all routes
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ msg: "File size too large. Max 5MB." });
    }
  }
  if (error.message === "Only PDF, DOC, and DOCX files are allowed") {
    return res.status(400).json({ msg: error.message });
  }
  res.status(500).json({ msg: error.message || "Server error" });
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
