const mongoose = require('mongoose');
const crypto = require('crypto');

function generateTrackingId() {
  return `CS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

const ticketSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    unique: true,
    index: true
  },

  // NEW FIELD (IMPORTANT)
  assignedArea: {
    type: String,
    default: "Other"
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  userEmail: {
    type: String
  },

  aiCategory: {
    type: String,
    enum: ['Dead Animal', 'Sewer Damage', 'Potholes', 'General Waste', 'Pending Analysis'],
    default: 'Pending Analysis'
  },

  confidence: {
    type: Number,
    default: 0
  },

  user_name: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['citizen', 'authority'],
    default: 'citizen'
  },

  imageUrl: {
    type: String,
    required: true
  },

  location: {
    type: String,
    required: true
  },

  lat: {
    type: Number
  },

  lon: {
    type: Number
  },

  googleMapsUrl: {
    type: String
  },

  description: {
    type: String
  },

  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Verification Pending', 'Resolved', 'Rejected'],
    default: 'Open'
  },

  resolvedAt: {
    type: Date
  }

}, { timestamps: true });

// TTL Index: Deletes document 15 days after resolvedAt is set
ticketSchema.index({ resolvedAt: 1 }, { expireAfterSeconds: 15 * 24 * 60 * 60 });


ticketSchema.pre('validate', function () {
  if (!this.trackingId) {
    this.trackingId = generateTrackingId();
  }
});

module.exports = mongoose.model('Ticket', ticketSchema, 'tickets');