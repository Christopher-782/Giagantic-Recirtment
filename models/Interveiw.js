// --- models/Interview.js ---
const mongoose = require("mongoose");

const InterviewSchema = new mongoose.Schema({
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Applicant",
    required: true,
  },
  jobRole: {
    // Denormalized for easier display without extra joins
    type: String,
    required: true,
  },
  dateTime: {
    type: Date,
    required: true,
  },
  zoomLink: String,
  notes: String,
  dateScheduled: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Interview", InterviewSchema);
