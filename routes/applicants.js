const express = require("express");
const router = express.Router();
const { upload } = require("../config/cloudinary");
const Applicant = require("../models/Applicant");

// POST /api/applicants — Create applicant with CV upload
router.post("/", upload.single("cv"), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      jobRole,
      yearsExperience,
      coverLetter,
    } = req.body;

    // Check required fields
    if (!name || !email || !phone || !jobRole) {
      return res
        .status(400)
        .json({ msg: "Please provide all required fields" });
    }

    // req.file contains Cloudinary info after upload
    const applicantData = {
      name,
      email,
      phone,
      address,
      jobRole,
      yearsExperience: parseInt(yearsExperience) || 0,
      coverLetter,
      cvFile: req.file ? req.file.originalname : "", // Original filename
      cvUrl: req.file ? req.file.path : "", // Cloudinary URL
      cvPublicId: req.file ? req.file.filename : "", // For deletion if needed
      status: "Pending",
      appliedDate: new Date(),
    };

    const applicant = new Applicant(applicantData);
    await applicant.save();

    res.status(201).json({
      msg: "Application submitted successfully",
      applicant: {
        id: applicant._id,
        name: applicant.name,
        cvUrl: applicant.cvUrl,
      },
    });
  } catch (error) {
    console.error("Error creating applicant:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// GET /api/applicants — Return applicants with cvUrl
router.get("/", async (req, res) => {
  try {
    const applicants = await Applicant.find().sort({ appliedDate: -1 });
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
