import React, { useState } from 'react';
import { X, TrendingUp, Check, Clock } from 'lucide-react';

interface Bid {
  id: string;
  buyerId: string;
  buyerName?: string;
  amount: number;
  quantity?: number;
  timestamp?: string;
}

interface Crop {
  id: string;
  name: string;
  quantity: number;
  basePrice: number;
  currentBid?: number;
  bids: Bid[];
  status?: string;
  farmerId?: string;
  acceptedBidId?: string;
  tradeStatus?: string;
}

interface BidManagementModalProps {
  crop: Crop;
  onClose: () => void;
  onBidAccepted: (updatedCrop: Crop) => void;
  token: string;
  apiUrl: string;
}

const BidManagementModal: React.FC<BidManagementModalProps> = ({
  crop,
  onClose,
  onBidAccepted,
  token,
  apiUrl
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);

  const handleAcceptBid = async (bidId: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiUrl}/crops/${crop.id}/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bidId })
      });

      const data = await res.json();

      if (res.ok) {
        onBidAccepted(data.crop);
      } else {
        setError(data.error || 'Failed to accept bid');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBidding = async () => {
    if (!window.confirm('Accept the highest bid and end bidding?')) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiUrl}/crops/${crop.id}/end-bidding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        onBidAccepted(data.crop);
      } else {
        setError(data.error || 'Failed to end bidding');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const sortedBids = [...crop.bids].sort((a, b) => b.amount - a.amount);
  const highestBid = sortedBids[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2002] p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between text-white">
          <div>
            <h2 className="text-2xl font-bold">{crop.name}</h2>
            <p className="text-blue-100 text-sm mt-1">{crop.quantity}kg available</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Empty State */}
          {crop.bids.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">No bids yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Buyers will start bidding once they see your listing
              </p>
            </div>
          ) : (
            <>
              {/* Bids Summary */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 font-semibold uppercase">Total Bids</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{crop.bids.length}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 font-semibold uppercase">Highest Bid</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    ₹{highestBid?.amount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 font-semibold uppercase">Price Increase</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    +₹{(highestBid?.amount - crop.basePrice).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Bids List */}
              <div className="space-y-3 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">All Bids</h3>
                {sortedBids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                      selectedBidId === bid.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedBidId(bid.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-white font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {bid.buyerName || `Buyer ${bid.buyerId.slice(0, 8)}`}
                          </p>
                          {bid.timestamp && (
                            <p className="text-xs text-gray-500">
                              {new Date(bid.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₹{bid.amount.toLocaleString()}</p>
                        {index === 0 && (
                          <span className="inline-block mt-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Leading
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => selectedBidId && handleAcceptBid(selectedBidId)}
                  disabled={!selectedBidId || loading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 transition flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Accept Selected Bid
                </button>
                <button
                  onClick={handleEndBidding}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center justify-center gap-2"
                >
                  <TrendingUp size={18} />
                  End Bidding at Highest
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Tip:</strong> You can accept any bid or use "End Bidding at Highest" to automatically accept the leading bid. This will initiate the trade process.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BidManagementModal;
