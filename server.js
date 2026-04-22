  const express = require('express');
  const cors = require('cors');
  const dotenv = require('dotenv');
  const connectDB = require('./config/db');
  const fs = require('fs');
  const path = require('path');

  dotenv.config();

  connectDB();

  const app = express();


const corsOrigin = process.env.CORS_ORIGIN || "";

  // CORS_ORIGIN=https://yourfrontend.vercel.app,http://localhost:5173

  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((origin) => origin.trim().replace(/\/+$/, ''))
    : [];

 app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');

      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      console.log("❌ CORS Blocked:", cleanOrigin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());


  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));



  const uploadsDir = path.join(__dirname, 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use('/uploads', express.static(uploadsDir));


  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/reports', require('./routes/reportRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));



  app.get('/', (req, res) => {
    res.send('CleanSight AI API is running');
  });



  app.use((err, req, res, next) => {
    console.error(err.message);

    res.status(500).json({
      success: false,
      message: err.message || 'Server Error',
    });
  });



  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });