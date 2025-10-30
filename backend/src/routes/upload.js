const express = require('express');
const router = express.Router();

let cloudinaryUpload = null;
try {
  // Attempt to load Cloudinary uploader (CommonJS). If your config uses ESM default export,
  // ensure src/config/cloudinary.js exposes an object with `upload` or adapt accordingly.
  const cloudConfig = require('../config/cloudinary');
  // cloudConfig may export { upload } or a default with upload property
  cloudinaryUpload = cloudConfig && (cloudConfig.upload || (cloudConfig.default && cloudConfig.default.upload)) ? (cloudConfig.upload || cloudConfig.default.upload) : null;
} catch (err) {
  // ignore - cloudinary config not present
  cloudinaryUpload = null;
}
if (cloudinaryUpload) {
  console.log('Using Cloudinary uploader for /upload');
  // Use Cloudinary middleware when available
  // Wrap multer middleware so any upload errors are returned as JSON (not default HTML error page)
  router.post('/', (req, res) => {
    cloudinaryUpload.single('image')(req, res, function (err) {
      if (err) {
        console.error('Cloudinary upload middleware error:', err);
        // If cloudinary/multer produced an error object, make the response JSON
        return res.status(err.http_code || 400).json({ error: err.message || 'Cloud upload failed', details: err });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('Cloud upload result file:', req.file);
        const url = req.file?.path || req.file?.secure_url || req.file?.url || (req.file && req.file.filename) || null;
        return res.json({ url, message: 'File uploaded to cloud successfully', file: req.file });
      } catch (error) {
        console.error('Cloud upload error:', error);
        return res.status(500).json({ error: error.message || 'Cloud upload failed' });
      }
    });
  });
} else {
  // Fallback: local multer-based upload to public/uploads/inputs
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs').promises;

  // Ensure upload directory exists
  const createUploadDir = async () => {
    const uploadDir = path.join(__dirname, '../../public/uploads/inputs');
    try {
      await fs.access(uploadDir);
    } catch (error) {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    return uploadDir;
  };

  const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
      try {
        const uploadPath = await createUploadDir();
        cb(null, uploadPath);
      } catch (error) {
        cb(error, null);
      }
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) return cb(null, true);
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  });

  router.post('/', async (req, res) => {
    try {
      await createUploadDir();
      upload.single('image')(req, res, function(err) {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({
            error: err.message || 'Error uploading file',
            details: err
          });
        }
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('Local upload stored:', req.file.filename);
        const relativePath = '/uploads/inputs/' + req.file.filename;
        return res.json({ url: relativePath, message: 'File uploaded successfully', file: req.file });
      });
    } catch (error) {
      console.error('Server error during upload:', error);
      res.status(500).json({
        error: 'Failed to process upload',
        details: error.message
      });
    }
  });
}

module.exports = router;