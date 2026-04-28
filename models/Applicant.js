const mongoose = require("mongoose");

const applicantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String },
  jobRole: { type: String, required: true },
  yearsExperience: { type: Number, default: 0 },
  coverLetter: { type: String },
  cvFile: { type: String }, // Original filename
  cvUrl: { type: String }, // Cloudinary URL
  cvPublicId: { type: String }, // For deletion/updating
  status: {
    type: String,
    enum: ["Pending", "Shortlisted", "Rejected", "Hired"],
    default: "Pending",
  },
  appliedDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Applicant", applicantSchema);
