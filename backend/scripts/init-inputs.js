require('dotenv').config();
const { initDB, mongoDeleteMany, mongoInsertOne } = require('../src/db');

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
  },
  {
    name: "Cotton Seeds (Bt Cotton)",
    description: "High-quality cotton seeds with pest resistance",
    category: "seeds",
    price: 750,
    unit: "packet",
    imageUrl: "/images/inputs/cotton-seeds.jpg",
    vendorName: "Cotton Corp Ltd",
    inStock: true,
    stockQuantity: 300
  },
  {
    name: "Maize Seeds (Pioneer 3377)",
    description: "Hybrid maize seeds for better yield",
    category: "seeds",
    price: 280,
    unit: "kg",
    imageUrl: "/images/inputs/maize-seeds.jpg",
    vendorName: "Pioneer Seeds",
    inStock: true,
    stockQuantity: 500
  },
  {
    name: "Organic Compost",
    description: "100% natural organic compost for soil health",
    category: "fertilizers",
    price: 400,
    unit: "30kg bag",
    imageUrl: "/images/inputs/organic-compost.jpg",
    vendorName: "Organic Farms Co",
    inStock: true,
    stockQuantity: 1000
  },
  {
    name: "Zinc Sulphate",
    description: "Micronutrient supplement for crops",
    category: "fertilizers",
    price: 180,
    unit: "kg",
    imageUrl: "/images/inputs/zinc-sulphate.jpg",
    vendorName: "MicroNutrients Ltd",
    inStock: true,
    stockQuantity: 600
  },
  {
    name: "Fungicide Spray",
    description: "Effective against fungal diseases",
    category: "pesticides",
    price: 850,
    unit: "5L",
    imageUrl: "/images/inputs/fungicide.jpg",
    vendorName: "CropCare Chemicals",
    inStock: true,
    stockQuantity: 150
  },
  {
    name: "Insecticide Solution",
    description: "Broad-spectrum insect control",
    category: "pesticides",
    price: 1200,
    unit: "5L",
    imageUrl: "/images/inputs/insecticide.jpg",
    vendorName: "CropCare Chemicals",
    inStock: true,
    stockQuantity: 180
  },
  {
    name: "Bio Pesticide",
    description: "Natural pest control formulation",
    category: "pesticides",
    price: 600,
    unit: "5L",
    imageUrl: "/images/inputs/bio-pesticide.jpg",
    vendorName: "Organic Solutions Ltd",
    inStock: true,
    stockQuantity: 250
  }
];

async function initializeInputs() {
  try {
    console.log('Initializing database connection...');
    const db = await initDB();
    
    if (!db) {
      console.error('Failed to connect to MongoDB. Please check your connection string and make sure MongoDB is running.');
      process.exit(1);
    }

    console.log('Connected to MongoDB successfully.');
    console.log('Clearing existing inputs collection...');
    
    // Clear existing data
    await mongoDeleteMany('inputs', {});
    
    console.log('Adding sample inputs...');
    
    // Insert new samples
    for (const input of sampleInputs) {
      await mongoInsertOne('inputs', {
        ...input,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Added: ${input.name}`);
    }
    
    console.log('Sample inputs added successfully!');
    console.log(`Total products added: ${sampleInputs.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Error initializing inputs:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeInputs();