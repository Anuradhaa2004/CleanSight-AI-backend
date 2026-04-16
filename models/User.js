const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['citizen', 'authority'],
    default: 'citizen',
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  assignedArea: {
    type: String,
    enum: ['', 'Satna', 'Jabalpur', 'Rewa', 'Narsinghpur', 'Burhanpur', 'Other'],
    default: ''
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpiry: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
