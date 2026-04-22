import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, BarChart3, X, AlertCircle, CheckCircle, Plus, Package } from 'lucide-react';
import BidManagementModal from '../components/BidManagementModal';

interface Crop {
  id: string;
  name: string;
  quantity: number;
  basePrice: number;
  currentBid?: number;
  bids: any[];
  status?: string;
  farmerId?: string;
  acceptedBidId?: string;
  tradeStatus?: string;
}

const MyListings: React.FC = () => {
  const { token } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'accepted' | 'completed'>('all');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/crops/my-listings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setCrops(data);
      } else if (res.status === 401) {
        setMessage({ type: 'error', text: 'Authentication failed. Please login again.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch your listings' });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage({ type: 'error', text: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCrop = async (cropId: string) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;

    try {
      const res = await fetch(`${API}/crops/${cropId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setCrops(crops.filter(c => c.id !== cropId));
        setMessage({ type: 'success', text: 'Crop listing deleted successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete crop' });
      }
    } catch (err) {
      console.error('Delete error:', err);
      setMessage({ type: 'error', text: 'Connection error' });
    }
  };

  const handleOpenBidModal = (crop: Crop) => {
    setSelectedCrop(crop);
    setShowBidModal(true);
  };

  const handleBidAccepted = (updatedCrop: Crop) => {
    setCrops(crops.map(c => c.id === updatedCrop.id ? updatedCrop : c));
    setShowBidModal(false);
    setMessage({ type: 'success', text: 'Bid accepted! Waiting for buyer to confirm...' });
  };

  const filteredCrops = crops.filter(crop => {
    if (filter === 'all') return true;
    if (filter === 'open') return crop.tradeStatus !== 'accepted' && crop.tradeStatus !== 'confirmed';
    if (filter === 'accepted') return crop.tradeStatus === 'accepted';
    if (filter === 'completed') return crop.tradeStatus === 'confirmed';
    return true;
  });

  const getStatusBadge = (crop: Crop) => {
    if (crop.tradeStatus === 'confirmed') {
      return <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle size={12} /> Confirmed</span>;
    } else if (crop.tradeStatus === 'accepted') {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1"><AlertCircle size={12} /> Pending Trade</span>;
    } else if (crop.bids && crop.bids.length > 0) {
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Active Bids</span>;
    }
    return <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">No Bids</span>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-green to-green-700 px-6 py-5 text-white flex items-center justify-between">
        <h2 className="text-2xl font-black">My Listings</h2>
        <button
          onClick={() => window.location.href = '/'}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="font-medium text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/50 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Filter Buttons */}
        {!loading && (
          <div className="mb-6 flex gap-3 flex-wrap">
            {['all', 'open', 'accepted', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filter === f
                    ? 'bg-brand-green text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-brand-green'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-brand-green"></div>
              <p className="text-gray-600 font-medium">Loading your listings...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && crops.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-700 text-lg font-bold mb-2">No Listings Yet</p>
            <p className="text-gray-500 mb-4">Create your first crop listing to start receiving bids</p>
            <button
              onClick={() => window.location.href = '/marketplace'}
              className="px-6 py-2 bg-brand-green hover:bg-green-700 text-white rounded-lg font-bold transition-all inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create Listing
            </button>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && filteredCrops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredCrops.map(crop => (
              <div key={crop.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{crop.name}</h3>
                    <p className="text-xs text-gray-600">{crop.quantity}kg available</p>
                  </div>
                  {getStatusBadge(crop)}
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  {/* Price Boxes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Base Price</p>
                      <p className="text-lg font-black text-gray-900">₹{crop.basePrice}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Current Bid</p>
                      <p className="text-lg font-black text-brand-green">
                        {crop.currentBid ? `₹${crop.currentBid}` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Bids Count & Live Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <BarChart3 size={14} className="text-brand-green" />
                      <span className="text-sm font-bold text-gray-900">{crop.bids?.length || 0} Bid{crop.bids?.length !== 1 ? 's' : ''}</span>
                    </div>
                    {crop.bids && crop.bids.length > 0 && (
                      <span className="px-3 py-1 bg-brand-green text-white text-xs font-bold rounded-full">Live</span>
                    )}
                  </div>

                  {/* Pending Confirmation Message */}
                  {crop.acceptedBidId && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800 font-semibold">Accepted bid pending confirmation</p>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenBidModal(crop)}
                    disabled={crop.tradeStatus === 'confirmed'}
                    className="flex-1 px-3 py-2 bg-gray-300 text-gray-600 rounded font-semibold text-sm hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <BarChart3 size={14} />
                    Bids
                  </button>
                  <button
                    onClick={() => handleDeleteCrop(crop.id)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-all"
                    title="Delete listing"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Filtered State */}
        {!loading && crops.length > 0 && filteredCrops.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-700 font-bold mb-2">No listings match this filter</p>
            <p className="text-gray-500 text-sm">Try adjusting your filter to see more listings</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedCrop && showBidModal && (
        <BidManagementModal
          crop={selectedCrop}
          onClose={() => setShowBidModal(false)}
          onBidAccepted={handleBidAccepted}
          token={token || ''}
          apiUrl={API}
        />
      )}
    </div>
  );
};

export default MyListings;
