const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  submitReport,
  getReports,
  analyzeImage,
  submitTicket,
  getTickets,
  getTicketById,
  getTicketByTrackingId,
  updateTicketStatus,
  confirmTicketResolution
} = require('../controllers/reportController');

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

router.post('/', upload.single('image'), submitReport);
router.post('/ticket', upload.single('image'), submitTicket); // POST to /api/report/ticket
router.post('/analyze', upload.single('image'), analyzeImage);
router.get('/', getReports);
router.get('/tickets', getTickets);
router.get('/ticket/track/:trackingId', getTicketByTrackingId);
router.get('/ticket/:ticketId', getTicketById);
router.patch('/ticket/:ticketId/status', updateTicketStatus);
router.patch('/ticket/:ticketId/confirm-resolution', confirmTicketResolution);

module.exports = router;
