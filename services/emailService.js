const nodemailer = require('nodemailer');

let transporter;

const setupTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    console.log('✅ Gmail SMTP Transporter Initialized!');
  } else {
    console.log('\n--- WARNING: No SMTP credentials in .env ---');
    transporter = null;
  }
};

setupTransporter();

const sendOTP = async (email, otp) => {
  if (!transporter) {
    console.log('\n=======================================');
    console.log(`[TERMINAL LOG] OTP FOR: ${email}`);
    console.log(`CODE: ${otp}`);
    console.log('=======================================\n');
    return true;
  }

  try {
    console.log(`[EmailService] Attempting to send OTP email to ${email}...`);
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your OTP for CleanSight AI",
      text: `Your OTP is: ${otp}`,
      html: `<b>Your OTP is: ${otp}</b>`,
    });
    console.log("Real Email Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendPasswordReset = async (email, resetUrl) => {
  if (!transporter) {
    console.log('\n=======================================');
    console.log(`[TEST MODE] PASSWORD RESET FOR: ${email}`);
    console.log(`RESET LINK: ${resetUrl}`);
    console.log('=======================================\n');
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: '"CleanSight AI" <no-reply@cleansight.ai>',
      to: email,
      subject: 'Reset your CleanSight AI password',
      text: `Reset your password using this link: ${resetUrl}`,
      html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    });
    console.log('Real Email Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

const sendResetOTP = async (email, otp) => {
  if (!transporter) {
    console.log('\n=======================================');
    console.log(`[TERMINAL LOG] PASSWORD RESET OTP FOR: ${email}`);
    console.log(`CODE: ${otp}`);
    console.log('=======================================\n');
    return true;
  }

  try {
    console.log(`[EmailService] Attempting to send Reset OTP email to ${email}...`);
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Password Reset Code - CleanSight AI",
      text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
      html: `
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
      `,
    });
    console.log("Reset OTP Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending reset OTP email:", error);
    return false;
  }
};

const sendCitizenConfirmation = async (ticket) => {
  if (!transporter) {
    console.log(`[EmailService] Simulated confirmation email for ${ticket.userEmail} (No SMTP config)`);
    return true;
  }
  try {
    console.log(`[EmailService] Sending confirmation email to ${ticket.userEmail}...`);
    const { _id, aiCategory, location, user_name, userEmail } = ticket;
    await transporter.sendMail({
      from: `"CleanSight AI" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Ticket Confirmation - ${aiCategory} [#${_id.toString().slice(-6).toUpperCase()}]`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
          <h2 style="color: #4F46E5; text-align: center;">CleanSight AI: Report Received</h2>
          <p>Hello <b>${user_name}</b>,</p>
          <p>Your waste report has been successfully submitted and is being processed by the municipal authorities.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #4F46E5;">
            <p style="margin: 5px 0;"><b>Tracking ID:</b> #${_id.toString().toUpperCase()}</p>
            <p style="margin: 5px 0;"><b>Category:</b> ${aiCategory}</p>
            <p style="margin: 5px 0;"><b>Location:</b> ${location}</p>
          </div>
          <p>You can track the live status of your report on your dashboard.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/citizen" style="background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Track on Dashboard</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">CleanSight AI - Professional Waste Management Platform</p>
        </div>
      `,
    });
    console.log(`Confirmation email sent successfully to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending citizen confirmation:", error);
    return false;
  }
};

const sendAuthorityAlert = async (ticket, authorityEmail) => {
  if (!transporter) return true;
  try {
    const { _id, aiCategory, location, user_name, description, googleMapsUrl } = ticket;
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: authorityEmail,
      subject: `URGENT: New Incident in ${location.split(',').pop().trim()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
          <h2 style="color: #ef4444;">⚠️ New Waste Incident Reported</h2>
          <p>A new complaint has been filed in your assigned area. Please review the details below:</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fee2e2;">
            <p><b>Citizen Name:</b> ${user_name}</p>
            <p><b>Category:</b> ${aiCategory}</p>
            <p><b>Description:</b> ${description || 'No description provided'}</p>
            <p><b>Location:</b> ${location}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${googleMapsUrl}" style="background: #1E75FF; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Interactive Map</a>
          </div>
          <p>Action is required to maintain the cleanliness standards of our smart city.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">Authority Command Center - CleanSight AI Notification System</p>
        </div>
      `,
    });
    console.log(`Alert email sent to authority: ${authorityEmail}`);
  } catch (error) {
    console.error("Error sending authority alert:", error);
  }
};

const sendStatusUpdateEmail = async (ticket) => {
  if (!transporter) {
    console.log(`[EmailService] Simulated status update email for ${ticket.userEmail} to ${ticket.status}`);
    return true;
  }

  try {
    const { _id, aiCategory, status, user_name, userEmail } = ticket;
    
    let statusColor = '#64748b'; // Default generic gray
    let titleText = 'Complaint Status Updated';
    let bodyText = `The municipal authority has updated the status of your waste report. Your complaint is now marked as <b>${status}</b>.`;
    
    if (status === 'In Progress') {
      statusColor = '#2563eb'; // Professional Blue
      titleText = 'Complaint Officially Accepted';
      bodyText = `We are pleased to inform you that the municipal authority has successfully reviewed and <b>accepted</b> your waste report. <br/><br/>A field team has been assigned to address the issue, and the status is now marked as <span style="color: #2563eb; font-weight: bold;">In Progress</span>. We truly appreciate your active participation and vigilance in maintaining the cleanliness of our city.`;
    } else if (status === 'Rejected') {
      statusColor = '#ef4444'; // Red
      titleText = 'Complaint Closed';
      bodyText = `The municipal authority has reviewed your report. After assessment, it has been marked as <b>Closed/Rejected</b>. Thank you for utilizing the CleanSight AI platform.`;
    }

    await transporter.sendMail({
      from: `"CleanSight AI" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Update: Your Complaint [#${_id.toString().slice(-6).toUpperCase()}] is now ${status}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: ${statusColor}; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 25px;">${titleText}</h2>
          <p style="font-size: 16px; color: #334155;">Hello <b>${user_name}</b>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">${bodyText}</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${statusColor};">
            <p style="margin: 5px 0; font-size: 14px; color: #64748b;"><b>Tracking ID:</b> <span style="color: #0f172a;">#${_id.toString().toUpperCase()}</span></p>
            <p style="margin: 5px 0; font-size: 14px; color: #64748b;"><b>Category:</b> <span style="color: #0f172a;">${aiCategory}</span></p>
            <p style="margin: 5px 0; font-size: 14px; color: #64748b;"><b>Current Status:</b> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
          </div>
          
          <p style="font-size: 15px; color: #475569; text-align: center; margin-bottom: 25px;">Keep track of live updates on your citizen dashboard.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/citizen?track=${_id}" style="background: ${statusColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Access Dashboard</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 35px 0 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">CleanSight AI - Smart City Waste Management</p>
        </div>
      `,
    });
    console.log(`Status update email sent to citizen: ${userEmail} for status: ${status}`);
    return true;
  } catch (error) {
    console.error("Error sending status update email:", error);
    return false;
  }
};

const sendResolutionVerificationEmail = async (ticket) => {
  if (!transporter) {
    console.log(`[EmailService] Simulated resolution verification email for ${ticket.userEmail}`);
    return true;
  }

  try {
    const { _id, aiCategory, user_name, userEmail, trackingId, description, location } = ticket;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    await transporter.sendMail({
      from: `"CleanSight AI Support" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Action Required: Verify Resolution [#${trackingId}]`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Verification Required</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Has your issue been resolved correctly?</p>
          </div>
          
          <div style="padding: 35px 30px;">
            <p style="font-size: 16px; color: #1e293b; margin-bottom: 25px;">Hello <b>${user_name}</b>,</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.6;">The municipal authority has marked your waste report as <b>Resolved</b>. To maintain the highest standards of cleanliness, we require your confirmation before we officially close this case.</p>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #e2e8f0;">
              <div style="display: flex; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 12px; font-weight: 700; width: 100px; text-transform: uppercase;">Ticket ID</span>
                <span style="color: #0f172a; font-size: 14px; font-weight: 600;">#${trackingId}</span>
              </div>
              <div style="display: flex; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 12px; font-weight: 700; width: 100px; text-transform: uppercase;">Category</span>
                <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${aiCategory}</span>
              </div>
              <div style="display: flex; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 12px; font-weight: 700; width: 100px; text-transform: uppercase;">Location</span>
                <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${location}</span>
              </div>
              ${description ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
                <p style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 8px 0;">Description</p>
                <p style="color: #475569; font-size: 14px; margin: 0; font-style: italic;">"${description}"</p>
              </div>` : ''}
            </div>
            
            <div style="text-align: center; margin: 35px 0 20px 0;">
              <a href="${clientUrl}/citizen" style="background: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);">Verify Now on Dashboard</a>
            </div>
            
            <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 25px;">If you do not take action, the ticket will be automatically closed after the verification window expires.</p>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">CleanSight AI • Toward a Cleaner Future</p>
          </div>
        </div>
      `,
    });
    console.log(`Resolution verification email sent to citizen: ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending resolution verification email:", error);
    return false;
  }
};

module.exports = { 
  sendOTP, 
  sendPasswordReset, 
  sendResetOTP, 
  sendCitizenConfirmation, 
  sendAuthorityAlert,
  sendStatusUpdateEmail,
  sendResolutionVerificationEmail
};
