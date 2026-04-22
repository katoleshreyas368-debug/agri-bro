import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, BarChart3, Trash2, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import BidManagementModal from './BidManagementModal';
import PaymentProgressModal from './PaymentProgressModal';

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

interface MyListingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MyListingsModal: React.FC<MyListingsModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showPaymentProgress, setShowPaymentProgress] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'accepted' | 'completed'>('all');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen) {
      fetchCrops();
    }
  }, [isOpen]);

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
    setSelectedCrop(updatedCrop);
    // Show payment progress modal - farmer waits for buyer to confirm
    setShowPaymentProgress(true);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[2000]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-brand-green to-emerald-600 px-6 py-4 flex items-center justify-between text-white">
            <h2 className="text-xl font-bold">My Listings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6">
              {/* Message Alert */}
              {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center justify-between ${
                  message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {message.text}
                  </span>
                  <button onClick={() => setMessage(null)}>
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Filter Buttons */}
              <div className="flex gap-3 mb-6 flex-wrap">
                {['all', 'open', 'accepted', 'completed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      filter === f
                        ? 'bg-brand-green text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-brand-green'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <Loader size={32} className="text-brand-green animate-spin" />
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredCrops.length === 0 && (
                <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-lg">
                    {crops.length === 0 ? "You haven't listed any crops yet" : 'No listings match this filter'}
                  </p>
                </div>
              )}

              {/* Listings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCrops.map(crop => (
                  <div key={crop.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition">
                    {/* Card Header */}
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{crop.name}</h3>
                          <p className="text-xs text-gray-600">{crop.quantity}kg available</p>
                        </div>
                        {getStatusBadge(crop)}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-3">
                      {/* Price Info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-[10px] text-gray-600 font-semibold uppercase">Base Price</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">₹{crop.basePrice}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-[10px] text-gray-600 font-semibold uppercase">Current Bid</p>
                          <p className="text-sm font-bold text-blue-600 mt-1">
                            {crop.currentBid ? `₹${crop.currentBid}` : 'Pending'}
                          </p>
                        </div>
                      </div>

                      {/* Bids Count */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <BarChart3 size={16} className="text-green-600" />
                          <span className="font-semibold text-gray-900">{crop.bids?.length || 0} Bid{crop.bids?.length !== 1 ? 's' : ''}</span>
                        </div>
                        {crop.bids && crop.bids.length > 0 && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
                            Live
                          </span>
                        )}
                      </div>

                      {/* Accepted Bid Info */}
                      {crop.acceptedBidId && (
                        <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                          <p className="text-xs text-yellow-700 font-semibold">Accepted bid pending confirmation</p>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="p-5 pt-0 flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenBidModal(crop)}
                        disabled={crop.tradeStatus === 'confirmed'}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center justify-center gap-1.5"
                      >
                        <BarChart3 size={14} /> Bids
                      </button>
                      {crop.tradeStatus === 'accepted' && (
                        <button
                          onClick={() => {
                            setSelectedCrop(crop);
                            setShowPaymentProgress(true);
                          }}
                          className="flex-1 px-3 py-2 bg-orange-600 text-white rounded text-sm font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-1.5"
                        >
                          💳 Payment
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCrop(crop.id)}
                        className="px-3 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 transition"
                        title="Delete listing"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Modals */}
      {selectedCrop && showBidModal && (
        <BidManagementModal
          crop={selectedCrop}
          onClose={() => setShowBidModal(false)}
          onBidAccepted={handleBidAccepted}
          token={token || ''}
          apiUrl={API}
        />
      )}

      {selectedCrop && showPaymentProgress && (
        <PaymentProgressModal
          trade={{
            id: selectedCrop.id,
            name: selectedCrop.name,
            quantity: selectedCrop.quantity,
            currentBid: selectedCrop.currentBid || 0,
            acceptedBuyerId: ''
          }}
          onClose={() => {
            setShowPaymentProgress(false);
            setSelectedCrop(null);
            // Refresh crops to get updated status
            fetchCrops();
          }}
          token={token || ''}
          apiUrl={API}
        />
      )}
    </>
  );
};

export default MyListingsModal;
