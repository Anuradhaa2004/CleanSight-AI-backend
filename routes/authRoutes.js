const express = require('express');
const router = express.Router();
const {
  requestOTP,
  verifyOTP,
  loginUser,
  getUser,
  updateAssignedArea,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.get('/user', getUser);
router.post('/area', updateAssignedArea);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
