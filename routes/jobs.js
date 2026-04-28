// --- routes/jobs.js ---
const express = require("express");
const router = express.Router();
const Job = require("../models/Job"); // Adjust path as needed
const auth = require("../middleware/authMiddleware"); // Adjust path as needed

// @route   GET api/jobs
// @desc    Get all active jobs (for public careers page)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find({ active: true }).sort({ datePosted: -1 });
    res.json(jobs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/jobs/all
// @desc    Get all jobs (active and inactive, for admin)
// @access  Private (Admin)
router.get("/all", auth, async (req, res) => {
  // Optional: Add role-based authorization check here
  // if (req.user.role !== 'admin') {
  //   return res.status(403).json({ msg: 'Access denied' });
  // }
  try {
    const jobs = await Job.find().sort({ datePosted: -1 });
    res.json(jobs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/jobs
// @desc    Create a new job
// @access  Private (Admin)
router.post("/", auth, async (req, res) => {
  // if (req.user.role !== 'admin') { return res.status(403).json({ msg: 'Access denied' }); }
  const { title, department, location, description, deadline, active } =
    req.body;
  try {
    const newJob = new Job({
      title,
      department,
      location,
      description,
      deadline,
      active,
    });
    const job = await newJob.save();
    res.status(201).json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   PUT api/jobs/:id
// @desc    Update a job
// @access  Private (Admin)
router.put("/:id", auth, async (req, res) => {
  // if (req.user.role !== 'admin') { return res.status(403).json({ msg: 'Access denied' }); }
  try {
    let job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }, // Return the updated document
    );
    res.json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   DELETE api/jobs/:id
// @desc    Delete a job
// @access  Private (Admin)
router.delete("/:id", auth, async (req, res) => {
  // if (req.user.role !== 'admin') { return res.status(403).json({ msg: 'Access denied' }); }
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }
    await Job.findByIdAndRemove(req.params.id);
    res.json({ msg: "Job removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
