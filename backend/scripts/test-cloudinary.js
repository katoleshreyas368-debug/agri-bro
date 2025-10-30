// Quick test script to verify Cloudinary credentials and upload flow.
// Usage: node -r dotenv/config scripts/test-cloudinary.js

const path = require('path');
const cfg = require('../config/cloudinary');

if (!cfg || !cfg.cloudinary) {
  console.error('Cloudinary config not found (expected ../config/cloudinary).');
  process.exit(1);
}

const cloudinary = cfg.cloudinary;

// A small public image URL to test remote upload
const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';

async function run() {
  try {
    console.log('Attempting Cloudinary upload test...');
    const res = await cloudinary.uploader.upload(testImageUrl, { folder: process.env.CLOUDINARY_FOLDER || 'my_project_uploads' });
    console.log('Upload successful. Result (truncated):', {
      public_id: res.public_id,
      secure_url: res.secure_url,
      bytes: res.bytes,
    });
  } catch (err) {
    console.error('Upload test failed:', err && err.message ? err.message : err);
    if (err && err.http_code) console.error('HTTP code:', err.http_code);
    process.exit(2);
  }
}

run();
