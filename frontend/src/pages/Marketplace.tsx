import React, { useState } from 'react';
import { Clock, MapPin, TrendingUp, Plus, Gavel, Filter, Search, BarChart3, Users } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import AddCropModal from '../components/AddCropModal';
import BidModal from '../components/BidModal';
import CropImage from '../components/CropImage';

// Custom Rupee Icon Component
const RupeeIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

const Marketplace: React.FC = () => {
  const { crops } = useData();
  const { user, isAuthenticated } = useAuth();
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'time' | 'bids'>('time');

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  // Filter and sort crops
  const filteredCrops = crops
    .filter(crop => {
      const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           crop.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           crop.farmerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || crop.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.currentBid - a.currentBid;
        case 'bids':
          return b.bids.length - a.bids.length;
        case 'time':
        default:
          return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      }
    });

  // Market statistics
  const totalCrops = crops.length;
  const activeCrops = crops.filter(crop => crop.status === 'active').length;
  const totalBids = crops.reduce((sum, crop) => sum + crop.bids.length, 0);
  const avgPrice = crops.length > 0 ? crops.reduce((sum, crop) => sum + crop.currentBid, 0) / crops.length : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Crop Marketplace</h1>
            <p className="text-gray-600 mt-2">Transparent bidding for fair crop prices</p>
          </div>
          {isAuthenticated && user?.type === 'farmer' && (
            <button
              onClick={() => setShowAddCrop(true)}
              className="mt-4 sm:mt-0 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              List Your Crop
            </button>
          )}
        </div>

        {/* Market Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Crops</p>
                <p className="text-2xl font-bold text-gray-900">{totalCrops}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Auctions</p>
                <p className="text-2xl font-bold text-gray-900">{activeCrops}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <Gavel className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Bids</p>
                <p className="text-2xl font-bold text-gray-900">{totalBids}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <RupeeIcon className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold text-gray-900">₹{Math.round(avgPrice)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search crops, locations, or farmers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="time">Time Left</option>
                <option value="price">Price</option>
                <option value="bids">Bids</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Auctions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCrops.map((crop) => (
            <div key={crop.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative">
                <CropImage
                  src={crop.imageUrl}
                  alt={crop.name}
                  className="w-full h-48 object-cover"
                  fallbackSrc="/images/crops/Wheat.jpg"
                />
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
                  crop.status === 'active' ? 'bg-green-600 text-white' :
                  crop.status === 'completed' ? 'bg-blue-600 text-white' :
                  'bg-red-600 text-white'
                }`}>
                  {crop.status}
                </div>
                {crop.bids.length > 0 && (
                  <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    {crop.bids.length} bids
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{crop.name}</h3>
                    <p className="text-gray-600">{crop.quantity} {crop.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">₹{crop.currentBid}</p>
                    <p className="text-sm text-gray-500">per quintal</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{crop.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="text-sm">{formatTimeRemaining(crop.endTime)}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">{crop.farmerName}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Base Price: ₹{crop.basePrice}</p>
                    <p className="text-sm text-green-600 font-medium">
                      +{Math.round(((crop.currentBid - crop.basePrice) / crop.basePrice) * 100)}% above base
                    </p>
                  </div>

                  {isAuthenticated && user?.type === 'buyer' && crop.status === 'active' && (
                    <button
                      onClick={() => setSelectedCrop(crop.id)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Gavel className="h-4 w-4 mr-2" />
                      Place Bid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCrops.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Crops Found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddCrop && (
        <AddCropModal onClose={() => setShowAddCrop(false)} />
      )}
      {selectedCrop && (
        <BidModal
          cropId={selectedCrop}
          onClose={() => setSelectedCrop(null)}
        />
      )}
    </div>
  );
};

export default Marketplace;