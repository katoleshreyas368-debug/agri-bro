const mongoose = require('mongoose');
const InputItem = require('../models/InputItem');

const sampleInputs = [
  {
    name: "Wheat Seeds (HD-2967)",
    description: "High yielding wheat variety suitable for North Indian conditions",
    category: "seeds",
    price: 45,
    unit: "kg",
    imageUrl: "/images/inputs/wheat-seeds.jpg",
    vendorName: "AgriSeeds Pvt Ltd",
    inStock: true,
    stockQuantity: 1000
  },
  {
    name: "NPK Fertilizer (10:26:26)",
    description: "Balanced NPK fertilizer for better crop growth",
    category: "fertilizers",
    price: 1200,
    unit: "50kg bag",
    imageUrl: "/images/inputs/npk-fertilizer.jpg",
    vendorName: "FertiFarm Solutions",
    inStock: true,
    stockQuantity: 500
  },
  {
    name: "Rice Seeds (Pusa Basmati)",
    description: "Premium basmati rice variety with excellent aroma",
    category: "seeds",
    price: 85,
    unit: "kg",
    imageUrl: "/images/inputs/rice-seeds.jpg",
    vendorName: "Rice Seeds Co.",
    inStock: true,
    stockQuantity: 750
  },
  {
    name: "Urea Fertilizer",
    description: "High nitrogen fertilizer for leafy growth",
    category: "fertilizers",
    price: 800,
    unit: "50kg bag",
    imageUrl: "/images/inputs/urea.jpg",
    vendorName: "FertiFarm Solutions",
    inStock: true,
    stockQuantity: 1200
  },
  {
    name: "Neem Based Pesticide",
    description: "Organic pest control solution",
    category: "pesticides",
    price: 450,
    unit: "5L",
    imageUrl: "/images/inputs/neem-pesticide.jpg",
    vendorName: "Organic Solutions Ltd",
    inStock: true,
    stockQuantity: 200
  },
  {
    name: "DAP Fertilizer",
    description: "Diammonium phosphate for root development",
    category: "fertilizers",
    price: 1400,
    unit: "50kg bag",
    imageUrl: "/images/inputs/dap.jpg",
    vendorName: "FertiFarm Solutions",
    inStock: true,
    stockQuantity: 800
  }
];

async function seedInputs() {
  try {
    // Clear existing data
    await InputItem.deleteMany({});
    
    // Insert sample data
    await InputItem.insertMany(sampleInputs);
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

module.exports = seedInputs;