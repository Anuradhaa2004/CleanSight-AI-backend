const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/cleansight';

  if (primaryUri && primaryUri.startsWith('mongodb')) {
    try {
      const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`Primary MongoDB connection failed (${error.message}). Falling back to local MongoDB: ${fallbackUri}`);
    }
  }

  try {
    const conn = await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 4000 });
    console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to local MongoDB: ${error.message}`);
  }
};

module.exports = connectDB;

