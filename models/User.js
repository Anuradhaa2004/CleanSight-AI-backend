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
  },
  about: {
    type: String,
    default: ''
  },
  profilePic: {
    type: String,
    default: ''
  },
  passwordUpdateHistory: [
    {
      type: Date
    }
  ],
  dob: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['', 'Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'],
    default: ''
  },
  exactLocation: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  languages: [
    {
      type: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
