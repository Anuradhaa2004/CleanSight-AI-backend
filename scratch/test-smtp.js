const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Testing SMTP with User:', process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mailOptions = {
  from: process.env.SMTP_USER,
  to: process.env.SMTP_USER,
  subject: 'Test Email - CleanSight AI',
  text: 'If you receive this, SMTP is working!',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('SMTP TEST FAILED:', error);
  } else {
    console.log('SMTP TEST SUCCESSFUL:', info.response);
  }
});
