// Thin CommonJS wrapper that proxies to ../../config/cloudinary.js
// This exists so routes under src/ can require('../config/cloudinary') as expected.
try {
  module.exports = require('../../config/cloudinary');
} catch (err) {
  // If the top-level config is missing, export a noop so requiring code can handle fallback
  module.exports = null;
}
