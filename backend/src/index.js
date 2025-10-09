require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const cropsRoutes = require('./routes/crops');
const inputsRoutes = require('./routes/inputs');
const logisticsRoutes = require('./routes/logistics');
const communityRoutes = require('./routes/community');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/crops', cropsRoutes);
app.use('/inputs', inputsRoutes);
app.use('/logistics', logisticsRoutes);
app.use('/community', communityRoutes);
app.use('/health', healthRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AGRIBro backend running' });
});

// Bind to all interfaces by default. This avoids issues where localhost/::1/127.0.0.1
// behave differently on some Windows environments or are blocked by local networking.
const HOST = process.env.HOST || '0.0.0.0';

// Better error handling and explicit host binding to avoid ambiguous listens on some Windows setups
// Export app for tests
module.exports = app;

// Only start server when this file is run directly
if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err && err.message ? err.message : err);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err && err.stack ? err.stack : err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason);
  });
}
