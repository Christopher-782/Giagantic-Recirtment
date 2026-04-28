const express = require("express");
const router = express.Router();
const Interview = require("../models/Interveiw"); // ✓ Fixed typo
const Applicant = require("../models/Applicant");
const auth = require("../middleware/authMiddleware");

// POST api/interviews
router.post("/", auth, async (req, res) => {
  const { applicantId, dateTime, zoomLink, notes } = req.body;
  try {
    const applicant = await Applicant.findById(applicantId);
    if (!applicant) {
      return res.status(404).json({ msg: "Applicant not found" });
    }

    const newInterview = new Interview({
      applicant: applicantId,
      jobRole: applicant.jobRole,
      dateTime,
      zoomLink,
      notes,
    });
    const interview = await newInterview.save();

    if (applicant.status === "Pending") {
      applicant.status = "Shortlisted";
      await applicant.save();
    }

    res.status(201).json(interview);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// GET api/interviews
router.get("/", auth, async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate("applicant", ["name", "email"])
      .sort({ dateTime: 1 });
    res.json(interviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
