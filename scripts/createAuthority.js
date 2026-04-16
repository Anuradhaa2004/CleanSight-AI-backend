require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n=======================================');
    console.log('🏛️  CLEANSIGHT AI - AUTHORITY CREATOR 🏛️');
    console.log('=======================================\n');

    const area = await question('Enter Municipal Location (e.g., Satna): ');
    
    if (!area) {
        console.log('\n❌ Location cannot be empty.');
        process.exit(1);
    }

    const email = await question(`Enter Login Email for ${area}: `);
    const password = await question(`Enter Secure Password for ${area}: `);
    
    // Check if exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('\n❌ An account with this email already exists!');
      process.exit(1);
    }
    
    const newAdmin = new User({
      name: `${area} Authority`,
      email: email,
      password: password, // Will be automatically hashed by User.js pre-save hook
      role: 'authority',
      assignedArea: area,
      isVerified: true
    });

    await newAdmin.save();
    
    console.log('\n✅ SUCCESS! Authority Account Created!');
    console.log('---------------------------------------');
    console.log(`Location:   ${area}`);
    console.log(`Admin Name: ${area} Authority`);
    console.log(`Email:      ${email}`);
    console.log(`Password:   ${password}`);
    console.log(`Login URL:  http://localhost:5173/login`);
    console.log('---------------------------------------\n');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
  } finally {
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
