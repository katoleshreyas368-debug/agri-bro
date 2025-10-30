import { Crop, InputItem, CommunityPost } from './DataContext';

const getImageUrl = (cropName: string) => {
  const filenameMap: { [key: string]: string } = {
    'Wheat': 'Wheat.jpg',
    'Rice': 'Rice.jpg',
    'Corn/Maize': 'Corn.jpg',
    'Soybeans': 'Soybeans.jpg',
    'Cotton': 'Cotton.jpg',
    'Sugarcane': 'Sugarcane.jpg',
    'Potatoes': 'Potatoes.jpg',
    'Onions': 'Onions.jpg',
    'Tomatoes': 'Tomatoes.jpg',
    'Pulses (Lentils)': 'Pulse.jpg'
  };
  const filename = filenameMap[cropName] || `${cropName}.jpg`;
  return `/images/crops/${filename}`;
};


export const demoCrops: Crop[] = [
  {
    id: '1',
    name: 'Wheat',
    quantity: 100,
    unit: 'quintals',
    basePrice: 2000,
    currentBid: 2150,
    farmerId: 'farmer1',
    farmerName: 'राज कुमार',
    location: 'Punjab',
    imageUrl: getImageUrl('Wheat'),
    bids: [
      { id: '1', buyerId: 'buyer1', buyerName: 'ABC Traders', amount: 2100, timestamp: '2025-01-01T10:00:00Z' },
      { id: '2', buyerId: 'buyer2', buyerName: 'XYZ Mills', amount: 2150, timestamp: '2025-01-01T11:00:00Z' }
    ],
    status: 'active',
    endTime: '2025-01-15T18:00:00Z'
  },
  {
    id: '2',
    name: 'Rice',
    quantity: 75,
    unit: 'quintals',
    basePrice: 1800,
    currentBid: 1950,
    farmerId: 'farmer2',
    farmerName: 'सुरेश पटेल',
    location: 'Haryana',
    imageUrl: getImageUrl('Rice'),
    bids: [
      { id: '3', buyerId: 'buyer3', buyerName: 'Rice Export Co.', amount: 1950, timestamp: '2025-01-01T12:00:00Z' }
    ],
    status: 'active',
    endTime: '2025-01-14T18:00:00Z'
  }
];

export const demoInputs: InputItem[] = [
  {
    id: '1',
    name: 'Wheat Seeds (HD-2967)',
    category: 'seeds',
    price: 45,
    unit: 'per kg',
    imageUrl: '/images/static/wheat-seeds.jpg',
    vendorId: 'vendor1',
    vendorName: 'AgriSeeds Pvt Ltd',
    description: 'High yielding wheat variety suitable for North Indian conditions',
    inStock: true
  },
  {
    id: '2',
    name: 'NPK Fertilizer (10:26:26)',
    category: 'fertilizers',
    price: 1200,
    unit: 'per 50kg bag',
    imageUrl: '/images/static/npk-fertilizer.jpg',
    vendorId: 'vendor2',
    vendorName: 'FertiFarm Solutions',
    description: 'Balanced NPK fertilizer for better crop growth',
    inStock: true
  }
];

export const demoPosts: CommunityPost[] = [
  {
    id: '1',
    authorId: 'farmer1',
    authorName: 'राज कुमार',
    title: 'Wheat crop disease prevention tips',
    content: 'I want to share some effective methods for preventing rust disease in wheat crops...',
    timestamp: '2025-01-01T09:00:00Z',
    replies: [
      {
        id: '1',
        authorId: 'farmer3',
        authorName: 'अमित शर्मा',
        content: 'Very helpful! I will try these methods in my field.',
        timestamp: '2025-01-01T10:00:00Z'
      }
    ]
  }
];