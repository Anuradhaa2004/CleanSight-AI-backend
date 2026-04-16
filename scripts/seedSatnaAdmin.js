require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

// Generated secure password for Satna Authority
const SATNA_ADMIN_EMAIL = 'admin.satna@cleansight.com';
const SATNA_ADMIN_PASSWORD = 'SafeClean$2026#Satna';
const SATNA_ADMIN_NAME = 'Satna Authority';

async function seedSatnaAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Check if Satna admin already exists
    const existingUser = await User.findOne({ email: SATNA_ADMIN_EMAIL });
    if (existingUser) {
      console.log('✓ Satna Authority account already exists');
      console.log(`  Email: ${existingUser.email}`);
      console.log(`  Role: ${existingUser.role}`);
      console.log(`  Assigned Area: ${existingUser.assignedArea}`);
      console.log(`  Verified: ${existingUser.isVerified}`);
      await mongoose.connection.close();
      return;
    }

    // Create new Satna Authority account
    const satnaAdmin = new User({
      name: SATNA_ADMIN_NAME,
      email: SATNA_ADMIN_EMAIL,
      password: SATNA_ADMIN_PASSWORD,
      role: 'authority',
      assignedArea: 'Satna',
      isVerified: true, // Pre-verified for immediate login
      otp: undefined,
      otpExpiry: undefined
    });

    await satnaAdmin.save();
    console.log('\n✓ Satna Authority account created successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('SATNA AUTHORITY ACCOUNT CREDENTIALS');
    console.log('═══════════════════════════════════════════════');
    console.log(`Email:    ${SATNA_ADMIN_EMAIL}`);
    console.log(`Password: ${SATNA_ADMIN_PASSWORD}`);
    console.log(`Role:     Authority`);
    console.log(`Area:     Satna`);
    console.log('═══════════════════════════════════════════════\n');
    console.log('✓ Account is pre-verified and ready to login');
    console.log('✓ Dashboard will auto-filter reports for Satna location\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('✗ Error seeding Satna admin:', error.message);
    process.exit(1);
  }
}

seedSatnaAdmin();
