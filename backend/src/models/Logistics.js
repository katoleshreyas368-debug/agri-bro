const mongoose = require('mongoose');

const logisticsSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    farmerId: { type: String, required: true },
    farmerName: { type: String, required: true },
    cropType: { type: String, required: true },
    quantity: { type: Number, required: true },
    fromLocation: { type: String, required: true },
    toLocation: { type: String, required: true },
    requestedDate: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'in-transit', 'completed'],
        default: 'pending'
    },
    transporterId: { type: String, default: null },
    transporterName: { type: String, default: null },
    progress: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

module.exports = mongoose.model('Logistics', logisticsSchema);
