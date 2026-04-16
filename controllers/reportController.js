const mongoose = require('mongoose');
const Report = require('../models/Report');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { categorizeWasteImage } = require('../services/aiService');
const { sendCitizenConfirmation, sendAuthorityAlert, sendStatusUpdateEmail, sendResolutionVerificationEmail } = require('../services/emailService');

const getTickets = async (req, res) => {
  try {
    const { email, userId, limit, role, area } = req.query;
    const query = {};

    // Authority filtering
    if (role === 'authority' && area) {
      query.assignedArea = area;
    } 
    // Citizen filtering
    else {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        query.userId = userId;
      } else if (email) {
        query.userEmail = email;
      }

      if (!query.userId && !query.userEmail) {
        return res.status(400).json({ message: 'email or userId is required for non-authorities' });
      }
    }

    const parsedLimit = Number(limit);
    const ticketLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 0;

    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .limit(ticketLimit);

    res.status(200).json(tickets);

  } catch (error) {
    res.status(500).json({
      message: 'Server error while fetching tickets',
      error: error.message
    });
  }
};

const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket id' });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.status(200).json(ticket);

  } catch (error) {
    res.status(500).json({
      message: 'Server error while fetching ticket',
      error: error.message
    });
  }
};

const getTicketByTrackingId = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const ticket = await Ticket.findOne({ trackingId: trackingId.toUpperCase() });

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.status(200).json(ticket);

  } catch (error) {
    res.status(500).json({
      message: 'Server error while fetching ticket',
      error: error.message
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    let { status } = req.body;

    if (!['Open', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket id' });
    }

    // Special logic: If authority marks as Resolved, it goes to "Verification Pending" first
    const isResolving = status === 'Resolved';
    if (isResolving) {
      status = 'Verification Pending';
    }

    const updateData = { status };
    if (status === 'Rejected') {
      updateData.resolvedAt = new Date();
    }

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true }
    );

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.status(200).json({ message: 'Status updated successfully', ticket });

    // Send appropriate email
    if (ticket.userEmail) {
      setImmediate(async () => {
        try {
          if (isResolving) {
            await sendResolutionVerificationEmail(ticket);
          } else {
            await sendStatusUpdateEmail(ticket);
          }
        } catch (e) {
          console.error('[updateTicketStatus] Citizen email failed:', e);
        }
      });
    }

  } catch (error) {
    res.status(500).json({
      message: 'Server error updating ticket status',
      error: error.message
    });
  }
};

const confirmTicketResolution = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { confirmed } = req.body; // true if resolved, false if still pending

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket id' });
    }

    const newStatus = confirmed ? 'Resolved' : 'In Progress';
    
    const updateData = { status: newStatus };
    if (confirmed) {
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedAt = null; // Clear if re-opened
    }

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true }
    );

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.status(200).json({ 
      message: confirmed ? 'Ticket resolution confirmed' : 'Ticket reopened', 
      ticket 
    });

    // Notify citizen of final resolution if they confirmed it
    if (ticket.userEmail && confirmed) {
      setImmediate(async () => {
        try {
          await sendStatusUpdateEmail(ticket);
        } catch (e) {
          console.error('[confirmTicketResolution] Final confirmation email failed:', e);
        }
      });
    }

  } catch (error) {
    res.status(500).json({
      message: 'Server error confirming resolution',
      error: error.message
    });
  }
};

const submitTicket = async (req, res) => {
  console.log('[submitTicket] Incoming request body:', req.body);
  try {
    const { user_name, userEmail, description, location, userId, role, lat, lon, aiCategory } = req.body;
    const file = req.file;

    if (!file) {
      console.log('[submitTicket] Missing file');
      return res.status(400).json({ message: 'Image is required' });
    }

    if (!user_name) {
      console.log('[submitTicket] Missing user_name');
      return res.status(400).json({ message: 'User Name is required' });
    }

    if (!location) {
      console.log('[submitTicket] Missing location');
      return res.status(400).json({ message: 'Location is required' });
    }

    let resolvedUserId = null;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const existingUser = await User.findById(userId);
      if (existingUser) resolvedUserId = userId;
    }

    if (!resolvedUserId && userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (user) resolvedUserId = user._id;
    }

    let category = aiCategory || "General Waste";
    let confidence = 0;

    // Only analyze if the category is not provided from the frontend
    if (!aiCategory) {
      console.log('[submitTicket] No category provided, starting AI analysis...');
      const aiResult = await categorizeWasteImage(file.path, file.mimetype);
      if (aiResult) {
        category = aiResult.category;
        confidence = aiResult.confidence;
      }
    } else {
      console.log('[submitTicket] Using provided category:', aiCategory);
      confidence = 90;
    }

    // determine assigned area
    const knownAreas = ['Satna', 'Jabalpur', 'Rewa', 'Narsinghpur', 'Burhanpur'];
    let assignedArea = "Other";

    for (const area of knownAreas) {
      if (location.toLowerCase().includes(area.toLowerCase())) {
        assignedArea = area;
        break;
      }
    }

    const ticket = new Ticket({
      assignedArea,
      userId: resolvedUserId,
      userEmail: userEmail || null,
      user_name,
      role: role || 'citizen',
      aiCategory: category,
      confidence,
      imageUrl: `/uploads/${file.filename}`,
      description,
      location,
      lat: lat ? Number(lat) : null,
      lon: lon ? Number(lon) : null,
      googleMapsUrl: (lat && lon)
        ? `https://www.google.com/maps?q=${lat},${lon}`
        : null
    });

    await ticket.save();
    console.log('[submitTicket] Ticket saved successfully:', ticket.trackingId);

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });

    setImmediate(async () => {
      try {
        if (ticket.userEmail) {
          await sendCitizenConfirmation(ticket);
        }
        
        // Find authority for the assigned area and send alert
        const authorityUser = await User.findOne({ 
          role: 'authority', 
          assignedArea: assignedArea 
        });
        
        if (authorityUser && authorityUser.email) {
          // Send Email
          await sendAuthorityAlert(ticket, authorityUser.email);

          // Create Dashboard Notification
          const notification = new Notification({
            recipientUserId: authorityUser._id,
            recipientEmail: authorityUser.email,
            recipientRole: 'authority',
            area: assignedArea,
            type: 'NEW_TICKET',
            title: 'New Complaint Submitted',
            message: `A new ${ticket.aiCategory} incident has been reported in ${ticket.location.split(',')[0]}.`,
            ticketId: ticket._id
          });
          await notification.save();
          console.log('[submitTicket] Authority notification created in DB');
        }
      } catch (err) {
        console.error('[submitTicket] Background email sending failed:', err);
      }
    });

  } catch (error) {
    console.error('[submitTicket] Error:', error);
    res.status(500).json({
      message: 'Server error during ticket submission',
      error: error.message
    });
  }
};

const submitReport = async (req, res) => {
  try {
    const { userEmail, description, location, wasteCategory } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No image uploaded' });

    const report = new Report({
      userEmail,
      wasteCategory: wasteCategory || "General Waste",
      imageUrl: `/uploads/${file.filename}`,
      description,
      location,
    });

    await report.save();

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const analyzeImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const aiResult = await categorizeWasteImage(req.file.path, req.file.mimetype);
    res.status(200).json({
      category: aiResult?.category || 'General Waste',
      confidence: aiResult?.confidence || 50
    });
  } catch (error) {
    console.error('[analyzeImage] error:', error);
    res.status(500).json({ message: 'AI Analysis failed', error: error.message });
  }
};

module.exports = {
  submitReport,
  submitTicket,
  getReports: () => {},
  analyzeImage,
  getTickets,
  getTicketById,
  getTicketByTrackingId,
  updateTicketStatus,
  confirmTicketResolution
};
