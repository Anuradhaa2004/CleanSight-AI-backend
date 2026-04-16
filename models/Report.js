const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
  },
  wasteCategory: {
    type: String,
    required: true,
  },
  aiConfidence: {
    type: Number,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  location: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending',
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
