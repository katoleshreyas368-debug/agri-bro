require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const cropsRoutes = require('./routes/crops');
const inputsRoutes = require('./routes/inputs');
const logisticsRoutes = require('./routes/logistics');
const communityRoutes = require('./routes/community');
const healthRoutes = require('./routes/health');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});
app.use(express.json());
// CORS configuration
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/auth', authRoutes);
app.use('/crops', cropsRoutes);
app.use('/inputs', inputsRoutes);
app.use('/logistics', logisticsRoutes);
app.use('/community', communityRoutes);
app.use('/health', healthRoutes);
app.use('/upload', uploadRoutes);
app.use('/uploads', express.static('public/uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'AGRIBro backend running' });
});

// Export app for tests
module.exports = app;

// Only start server when this file is run directly
if (require.main === module) {
  // Start server first to ensure we're listening for requests
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
  });

  server.on('error', (err) => {
    console.error('Server error:', err && err.message ? err.message : err);
    // Exit on critical errors
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please choose a different port.`);
      process.exit(1);
    }
  });

  // Initialize DB after server is running
  initDB().then((db) => {
    if (db) {
      console.log('MongoDB connected successfully');
    } else {
      console.log('Running without MongoDB - using file-based storage');
    }
  }).catch((err) => {
    console.error('MongoDB connection error:', err);
    console.log('Running without MongoDB - using file-based storage');
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err && err.stack ? err.stack : err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason);
  });
}
