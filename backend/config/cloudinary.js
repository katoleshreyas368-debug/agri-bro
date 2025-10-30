const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

// Helper: strip surrounding single or double quotes which may be present in .env
const _clean = (v) => {
  if (!v && v !== 0) return v;
  return String(v).replace(/^\s*['"]?/, '').replace(/['"]?\s*$/, '');
};

cloudinary.config({
  cloud_name: _clean(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: _clean(process.env.CLOUDINARY_API_KEY),
  api_secret: _clean(process.env.CLOUDINARY_API_SECRET),
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER || 'my_project_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });

module.exports = { upload, cloudinary };
