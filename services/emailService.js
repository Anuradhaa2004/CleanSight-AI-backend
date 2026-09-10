const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let transporter = null;
let smtpEnabled = false;

// -------------------------------------------------------------
// 1. EmailJS Service Integration (Primary)
// -------------------------------------------------------------
const isEmailJSConfigured = () => {
  return Boolean(
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  );
};

const sendViaEmailJS = async ({ to, toName, subject, html, text, otp, resetUrl, extraParams = {} }, label = 'Email') => {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return false;
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: to,
      to_name: toName || (to ? to.split('@')[0] : 'User'),
      subject: subject,
      message_html: html,
      message: text || subject,
      otp: otp || '',
      reset_url: resetUrl || '',
      ...extraParams
    }
  };

  if (privateKey) {
    payload.accessToken = privateKey;
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[EmailJS] Error sending ${label} (${res.status}):`, errBody);
      return false;
    }

    console.log(`[EmailJS] ✅ ${label} sent successfully to ${to}`);
    return true;
  } catch (err) {
    console.error(`[EmailJS] Network error sending ${label}:`, err.message);
    return false;
  }
};

// -------------------------------------------------------------
// 2. SMTP Transporter Setup (Fallback)
// -------------------------------------------------------------
const setupTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
      });
      smtpEnabled = true;
      console.log('ℹ️  Gmail SMTP fallback configured');
    } catch (err) {
      console.warn('⚠️  Could not initialize SMTP fallback:', err.message);
      transporter = null;
      smtpEnabled = false;
    }
  } else {
    transporter = null;
    smtpEnabled = false;
  }
};

setupTransporter();

// -------------------------------------------------------------
// 3. Central Dispatcher (EmailJS -> SMTP -> Terminal Log)
// -------------------------------------------------------------
const dispatchEmail = async ({ to, toName, subject, html, text, otp, resetUrl, extraParams = {} }, label = 'Email') => {
  // A. Try EmailJS first if configured
  if (isEmailJSConfigured()) {
    console.log(`[EmailService] Sending ${label} via EmailJS to ${to}...`);
    const sent = await sendViaEmailJS({ to, toName, subject, html, text, otp, resetUrl, extraParams }, label);
    if (sent) return true;
    console.warn(`[EmailService] EmailJS failed. Checking fallback...`);
  }

  // B. Try SMTP if EmailJS is not configured or failed
  if (transporter && smtpEnabled) {
    try {
      console.log(`[EmailService] Attempting to send ${label} via SMTP to ${to}...`);
      await transporter.sendMail({
        from: `"CleanSight AI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: text || subject,
        html
      });
      console.log(`[EmailService] ✅ ${label} sent successfully via SMTP to ${to}`);
      return true;
    } catch (smtpErr) {
      console.error(`[EmailService] SMTP send failed: ${smtpErr.message}`);
    }
  }

  // C. Fallback: Always print OTP / links in terminal so development never breaks
  console.log('\n=======================================');
  console.log(`[TERMINAL EMAIL DISPATCH: ${label.toUpperCase()}]`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  if (otp) console.log(`OTP:     ${otp}`);
  if (resetUrl) console.log(`Link:    ${resetUrl}`);
  console.log('=======================================\n');
  return true;
};

// -------------------------------------------------------------
// 4. Exposed Email Handlers
// -------------------------------------------------------------

const sendOTP = async (email, otp) => {
  return await dispatchEmail({
    to: email,
    subject: 'Your OTP for CleanSight AI',
    otp: otp,
    text: `Your OTP is: ${otp}`,
    html: `<b>Your OTP is: ${otp}</b>`
  }, 'Registration OTP');
};

const sendPasswordReset = async (email, resetUrl) => {
  return await dispatchEmail({
    to: email,
    subject: 'Reset your CleanSight AI password',
    resetUrl: resetUrl,
    text: `Reset your password using this link: ${resetUrl}`,
    html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  }, 'Password Reset');
};

const sendResetOTP = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #1E75FF; text-align: center;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your CleanSight AI password. Use the code below to complete the process:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #0f172a; background: #f1f5f9; padding: 10px 20px; border-radius: 8px;">${otp}</span>
      </div>
      <p>This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">CleanSight AI - Professional Waste Management Platform</p>
    </div>
  `;

  return await dispatchEmail({
    to: email,
    subject: 'Password Reset Code - CleanSight AI',
    otp: otp,
    text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
    html: html
  }, 'Password Reset OTP');
};

const sendCitizenConfirmation = async (ticket) => {
  const { _id, aiCategory, location, user_name, userEmail } = ticket;
  const trackingId = _id ? _id.toString().toUpperCase() : 'TICKET';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
      <h2 style="color: #4F46E5; text-align: center;">CleanSight AI: Report Received</h2>
      <p>Hello <b>${user_name}</b>,</p>
      <p>Your waste report has been successfully submitted and is being processed by municipal authorities.</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #4F46E5;">
        <p style="margin: 5px 0;"><b>Tracking ID:</b> #${trackingId}</p>
        <p style="margin: 5px 0;"><b>Category:</b> ${aiCategory}</p>
        <p style="margin: 5px 0;"><b>Location:</b> ${location}</p>
      </div>
      <p>You can track the live status of your report on your citizen dashboard.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${clientUrl}/citizen" style="background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Track on Dashboard</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">CleanSight AI - Professional Waste Management Platform</p>
    </div>
  `;

  return await dispatchEmail({
    to: userEmail,
    toName: user_name,
    subject: `Ticket Confirmation - ${aiCategory} [#${trackingId.slice(-6)}]`,
    html: html,
    extraParams: {
      tracking_id: trackingId,
      category: aiCategory,
      location: location
    }
  }, 'Citizen Confirmation');
};

const sendAuthorityAlert = async (ticket, authorityEmail) => {
  const { _id, aiCategory, location, user_name, description, googleMapsUrl } = ticket;
  const areaName = location ? location.split(',').pop().trim() : 'Jurisdiction';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
      <h2 style="color: #ef4444;">⚠️ New Waste Incident Reported</h2>
      <p>A new complaint has been filed in your assigned area. Please review details below:</p>
      <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
        <p><b>Citizen Name:</b> ${user_name}</p>
        <p><b>Category:</b> ${aiCategory}</p>
        <p><b>Description:</b> ${description || 'No description provided'}</p>
        <p><b>Location:</b> ${location}</p>
      </div>
      ${googleMapsUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${googleMapsUrl}" style="background: #1E75FF; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Interactive Map</a>
      </div>` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">Authority Command Center - CleanSight AI</p>
    </div>
  `;

  return await dispatchEmail({
    to: authorityEmail,
    subject: `URGENT: New Incident in ${areaName}`,
    html: html,
    extraParams: {
      area: areaName,
      category: aiCategory,
      location: location
    }
  }, 'Authority Alert');
};

const sendStatusUpdateEmail = async (ticket) => {
  const { _id, aiCategory, status, user_name, userEmail } = ticket;
  const trackingId = _id ? _id.toString().toUpperCase() : 'TICKET';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  let statusColor = '#64748b';
  let titleText = 'Complaint Status Updated';
  let bodyText = `The municipal authority has updated the status of your waste report to <b>${status}</b>.`;

  if (status === 'In Progress') {
    statusColor = '#2563eb';
    titleText = 'Complaint Officially Accepted';
    bodyText = `The municipal authority has accepted your waste report. A field team has been assigned, and the ticket is now <span style="color: #2563eb; font-weight: bold;">In Progress</span>.`;
  } else if (status === 'Rejected') {
    statusColor = '#ef4444';
    titleText = 'Complaint Closed';
    bodyText = `The municipal authority has assessed the report and marked it as <b>Closed/Rejected</b>.`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: ${statusColor}; text-align: center;">${titleText}</h2>
      <p>Hello <b>${user_name}</b>,</p>
      <p>${bodyText}</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${statusColor};">
        <p style="margin: 5px 0;"><b>Tracking ID:</b> #${trackingId}</p>
        <p style="margin: 5px 0;"><b>Category:</b> ${aiCategory}</p>
        <p style="margin: 5px 0;"><b>Current Status:</b> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
      </div>
      <div style="text-align: center;">
        <a href="${clientUrl}/citizen?track=${_id}" style="background: ${statusColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Access Dashboard</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 35px 0 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">CleanSight AI - Smart City Waste Management</p>
    </div>
  `;

  return await dispatchEmail({
    to: userEmail,
    toName: user_name,
    subject: `Update: Your Complaint [#${trackingId.slice(-6)}] is now ${status}`,
    html: html,
    extraParams: {
      status: status,
      tracking_id: trackingId
    }
  }, 'Status Update');
};

const sendResolutionVerificationEmail = async (ticket) => {
  const { _id, aiCategory, user_name, userEmail, trackingId, description, location } = ticket;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border-radius: 16px; border: 1px solid #e2e8f0; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Verification Required</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Has your issue been resolved correctly?</p>
      </div>
      <div style="padding: 25px 20px;">
        <p>Hello <b>${user_name}</b>,</p>
        <p>The municipal authority has marked your waste report as <b>Resolved</b>. Please confirm the resolution:</p>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><b>Ticket ID:</b> #${trackingId || _id}</p>
          <p style="margin: 5px 0;"><b>Category:</b> ${aiCategory}</p>
          <p style="margin: 5px 0;"><b>Location:</b> ${location}</p>
          ${description ? `<p style="margin: 5px 0;"><b>Description:</b> "${description}"</p>` : ''}
        </div>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${clientUrl}/citizen" style="background: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Verify on Dashboard</a>
        </div>
      </div>
    </div>
  `;

  return await dispatchEmail({
    to: userEmail,
    toName: user_name,
    subject: `Action Required: Verify Resolution [#${trackingId || _id}]`,
    html: html
  }, 'Resolution Verification');
};

module.exports = {
  sendOTP,
  sendPasswordReset,
  sendResetOTP,
  sendCitizenConfirmation,
  sendAuthorityAlert,
  sendStatusUpdateEmail,
  sendResolutionVerificationEmail,
  isEmailJSConfigured
};
