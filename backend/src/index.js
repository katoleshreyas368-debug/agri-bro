require('dotenv').config();
const express = require('express');
const http = require('http');              // NEW — Node's built-in http module
const { Server } = require('socket.io');   // NEW — Socket.io
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
const chatRoutes = require('./routes/chat');
const predictRoutes = require('./routes/predict');
const paymentRoutes = require('./routes/payment');
const shipmentPaymentRoutes = require('./routes/shipmentPayment');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// NEW: wrap express inside a plain http server so Socket.io can attach
const server = http.createServer(app);

// NEW: attach Socket.io to the http server
const io = new Server(server, {
  cors: {
    origin: true,                          // match existing CORS policy
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

// NEW: make `io` available to all route files via req.app.get('io')
app.set('io', io);

// NEW: Socket.io connection handler
io.on('connection', (socket) => {
  console.log('🔌 WebSocket connected:', socket.id);

  // When a client wants to watch a specific shipment
  socket.on('watch_shipment', (shipmentId) => {
    socket.join(shipmentId);
    console.log(`  └─ Socket ${socket.id} is watching shipment ${shipmentId}`);
  });

  // When a client stops watching a shipment
  socket.on('unwatch_shipment', (shipmentId) => {
    socket.leave(shipmentId);
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected:', socket.id);
  });
});

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
app.use('/chat', chatRoutes);
app.use('/api/predict', predictRoutes); // as requested
app.use('/payment', paymentRoutes);
app.use('/api/orders', paymentRoutes);  // Alias: POST /api/orders/create-order-with-fees
app.use('/shipment-payment', shipmentPaymentRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/uploads', express.static('public/uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'AGRIBro backend running' });
});

// Export app for tests
module.exports = app;

// Only start server when this file is run directly
if (require.main === module) {
  // Start server — use the http server (not app.listen) so Socket.io works
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('🔌 WebSocket server ready on same port');
    console.log('Press Ctrl+C to stop');
  });

  server.on('error', (err) => {
    console.error('Server error:', err && err.message ? err.message : err);
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

  // Pre-warm the embedding model so first chat request is fast
  const { getEmbedding } = require('../rag/embeddings');
  const { loadModel } = require('../ml/loadModel');

  getEmbedding('warmup').then(() => {
    console.log('Embedding model pre-warmed successfully');
  }).catch((err) => {
    console.error('Embedding model pre-warm failed:', err.message);
  });

  loadModel().then(() => {
    console.log('TFJS model loaded at startup successfully');
  }).catch((err) => {
    console.error('TFJS model load failed:', err.message);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err && err.stack ? err.stack : err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason);
  });
}
