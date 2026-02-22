const express = require('express');
const multer = require('multer');
const { predictDisease } = require('../../ml/loadModel');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only jpg, jpeg, png, webp are allowed.'), false);
        }
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Image file is required.' });
    }

    try {
        const result = await predictDisease(req.file.buffer);
        res.json({
            crop: result.crop,
            disease: result.disease,
            confidence: result.confidence
        });
    } catch (err) {
        console.error('Prediction error:', err);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

module.exports = router;
