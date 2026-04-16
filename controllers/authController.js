const User = require('../models/User');
const { sendOTP, sendPasswordReset } = require('../services/emailService');
const crypto = require('crypto');

// Generate 6 digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const requestOTP = async (req, res) => {
  const { email, password, role, name, assignedArea } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
 
  try {
    let user = await User.findOne({ email });

    if (user && user.isVerified) {
      return res.status(400).json({ message: 'User already exists. Please log in or use forgot password.' });
    }

    if (!user) {
      if (!password || !name) {
        return res.status(400).json({ message: 'Name and Password are required for registration' });
      }
      const newUserData = {
        email,
        password,
        name,
        role: role || 'citizen'
      };
      if (role === 'authority' && assignedArea) {
        newUserData.assignedArea = assignedArea;
      }
      user = new User(newUserData);
    } else {
      // Unverified user: allow re-requesting OTP and refreshing registration details
      if (password) user.password = password;
      if (role) user.role = role;
      if (name) user.name = name;
      if (role === 'authority' && assignedArea) user.assignedArea = assignedArea;
    }

    const otp = generateOTP();
    console.log(`Generated OTP for ${email}: ${otp}`); // Log OTP for debugging
    console.log(`[AuthController] Saving user data for ${email}...`);

    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    console.log(`[AuthController] User data saved. Handing off to EmailService...`);
    
    // Send OTP via email
    await sendOTP(email, otp);
    console.log(`[AuthController] EmailService handoff complete.`);

    res.status(200).json({ message: 'OTP sent successfully to email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const submittedOtp = String(otp).trim();

    if (!user.otp || !user.otpExpiry || user.otp !== submittedOtp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = crypto.randomBytes(20).toString('hex'); 

    res.status(200).json({ 
      message: 'Login successful', 
      token, 
      user: { 
        email: user.email, 
        id: user._id, 
        role: user.role, 
        name: user.name, 
        assignedArea: user.assignedArea || ''
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `Access denied. Account is registered as ${user.role}` });
    }

    const token = crypto.randomBytes(20).toString('hex');

    res.status(200).json({ 
      message: 'Login successful', 
      token, 
      user: { 
        email: user.email, 
        id: user._id, 
        role: user.role, 
        name: user.name, 
        assignedArea: user.assignedArea || ''
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUser = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      user: {
        email: user.email,
        id: user._id,
        role: user.role,
        name: user.name,
        assignedArea: user.assignedArea || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateAssignedArea = async (req, res) => {
  const { email, assignedArea } = req.body;

  if (!email || !assignedArea) {
    return res.status(400).json({ message: 'Email and assigned area are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'authority') {
      return res.status(403).json({ message: 'Assigned area can only be updated for authority users' });
    }

    user.assignedArea = assignedArea;
    await user.save();

    res.status(200).json({ 
      message: 'Assigned area updated successfully', 
      user: {
        email: user.email,
        id: user._id,
        role: user.role,
        name: user.name,
        assignedArea: user.assignedArea
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await User.findOne({ email });

    // Always return a generic response to avoid account enumeration
    const generic = { message: 'If that email exists, a 6-digit reset code has been sent.' };
    if (!user) return res.status(200).json(generic);

    const otp = generateOTP();
    console.log(`[PASS RESET] Generated OTP for ${email}: ${otp}`);

    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const { sendResetOTP } = require('../services/emailService');
    await sendResetOTP(email, otp);

    return res.status(200).json({ 
      message: 'Success', 
      detail: 'Verification code sent to your email.' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and newPassword are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code.' });
    }

    // Update password
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    
    await user.save();

    res.status(200).json({ message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
  loginUser,
  getUser,
  updateAssignedArea,
  forgotPassword,
  resetPassword
};
