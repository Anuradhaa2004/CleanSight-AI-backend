const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    recipientEmail: {
      type: String,
      index: true
    },
    recipientRole: {
      type: String,
      enum: ['authority', 'citizen', 'system'],
      default: 'authority',
      index: true
    },
    area: {
      type: String,
      index: true
    },
    type: {
      type: String,
      enum: ['NEW_TICKET'],
      default: 'NEW_TICKET',
      index: true
    },
    title: {
      type: String,
      default: 'New Complaint Submitted'
    },
    message: {
      type: String,
      default: ''
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      index: true
    },
    readAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');

