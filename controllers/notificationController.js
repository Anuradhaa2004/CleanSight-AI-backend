const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const { email, area, role, unreadOnly, limit } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const query = {
      recipientEmail: email
    };

    if (role) query.recipientRole = role;
    if (area) query.area = area;
    if (String(unreadOnly) === '1' || String(unreadOnly).toLowerCase() === 'true') {
      query.readAt = null;
    }

    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 30;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate('ticketId', 'trackingId aiCategory location status createdAt lat lon googleMapsUrl');

    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const { email, area, role } = req.query;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const query = { recipientEmail: email, readAt: null };
    if (role) query.recipientRole = role;
    if (area) query.area = area;

    const count = await Notification.countDocuments(query);
    return res.status(200).json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }
    if (!email) return res.status(400).json({ message: 'email is required' });

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientEmail: email },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ message: 'OK', notification });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const { email, area, role } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const query = { recipientEmail: email, readAt: null };
    if (role) query.recipientRole = role;
    if (area) query.area = area;

    const result = await Notification.updateMany(query, { readAt: new Date() });
    return res.status(200).json({ message: 'OK', modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};

