import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, CheckCircle, AlertCircle, TrendingUp, Package, Receipt } from 'lucide-react';
import TradePaymentModal from './TradePaymentModal';
import { calculateFees, formatINR } from '../utils/feeCalculator';

interface Trade {
  id: string;
  name: string;
  quantity: number;
  basePrice: number;
  currentBid: number;
  acceptedAmount?: number;
  farmerName: string;
  location: string;
  status: string;
  tradeStatus?: string;
  acceptedAt?: string;
}

interface BuyerTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BuyerTradesModal: React.FC<BuyerTradesModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen) {
      fetchTrades();
    }
  }, [isOpen]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/crops/my-trades`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setTrades(data);
      } else if (res.status === 401) {
        setMessage({ type: 'error', text: 'Authentication failed. Please login again.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch your trades' });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage({ type: 'error', text: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTrade = async (trade: Trade) => {
    // Show payment modal instead of directly confirming
    setSelectedTrade(trade);
    setShowPayment(true);
  };

  const handlePaymentComplete = () => {
    // Refresh trades list to show updated status
    fetchTrades();
    setShowPayment(false);
    setSelectedTrade(null);
    setMessage({ type: 'success', text: 'Trade confirmed and payment completed successfully!' });
  };

  const handleDeclineTrade = async () => {
    if (!window.confirm('Are you sure? This will reject the accepted bid and cancel the trade.')) return;
    
    // For now, just show a message. In a full implementation, you'd have an endpoint to decline
    setMessage({ type: 'error', text: 'Decline functionality coming soon' });
  };

  const getStatusBadge = (trade: Trade) => {
    if (trade.tradeStatus === 'confirmed') {
      return <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle size={12} /> Completed</span>;
    } else if (trade.tradeStatus === 'accepted') {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1"><AlertCircle size={12} /> Pending</span>;
    }
    return <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">Processing</span>;
  };

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true;
    if (filter === 'pending') return trade.tradeStatus === 'accepted';
    if (filter === 'completed') return trade.tradeStatus === 'confirmed';
    return true;
  });

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
        <div className="bg-white rounded-[24px] border border-gray-100 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between text-white">
            <div>
              <span className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.3em]">Buyer Transactions</span>
              <h2 className="text-2xl font-black mt-1">📦 My Trades</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {/* Message Alert */}
            {message && (
              <div className={`mb-6 p-4 rounded-[16px] flex items-center justify-between border ${
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

            {/* Filter Section */}
            {!loading && (
              <div className="mb-8 bg-gray-50 rounded-[20px] border border-gray-100 p-6">
                <div className="flex gap-3 flex-wrap">
                  {['all', 'pending', 'completed'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-all ${
                        filter === f
                          ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-600 hover:bg-gray-100'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="text-gray-600 font-medium">Loading your trades...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && trades.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[24px] border border-gray-100">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package size={32} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-700 text-lg font-bold mb-2">No Trades Yet</p>
                <p className="text-gray-500">Place a bid on crops in the marketplace to get started</p>
              </div>
            )}

            {/* Empty Filtered State */}
            {!loading && trades.length > 0 && filteredTrades.length === 0 && (
              <div className="text-center py-24 bg-gray-50 rounded-[24px] border border-gray-100">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-gray-400" />
                  </div>
                </div>
                <p className="text-gray-700 text-lg font-bold mb-2">
                  {filter === 'pending' ? 'No Pending Trades' : 'No Completed Trades'}
                </p>
                <p className="text-gray-500 text-sm">Check back later for updates</p>
              </div>
            )}

            {/* Trades Grid */}
            {!loading && filteredTrades.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrades.map(trade => (
                  <div key={trade.id} className="bg-white rounded-[20px] border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300">
                    {/* Card Header - Gradient */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-black truncate">{trade.name}</h3>
                          <p className="text-blue-100 text-sm font-semibold mt-1 flex items-center gap-2">
                            <Package size={14} />
                            {trade.quantity}kg from {trade.farmerName}
                          </p>
                        </div>
                        {getStatusBadge(trade)}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="px-6 py-6 space-y-5">
                      {/* Location & Info */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Location</span>
                          <span className="text-sm font-semibold text-gray-900">{trade.location}</span>
                        </div>
                      </div>

                      {/* Price Details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-[16px] p-4 border border-gray-100">
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-2">Base Price</p>
                          <p className="text-2xl font-black text-gray-900">₹{trade.basePrice}</p>
                          <p className="text-xs text-gray-500 mt-1">Per unit rate</p>
                        </div>
                        <div className="bg-blue-50 rounded-[16px] p-4 border border-blue-100">
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">Your Bid</p>
                          <p className="text-2xl font-black text-blue-600">₹{trade.currentBid || trade.acceptedAmount}</p>
                          <p className="text-xs text-blue-500 mt-1">Accepted</p>
                        </div>
                      </div>

                      {/* Total Price with Fee Breakdown */}
                      {(() => {
                        const bidAmount = trade.currentBid || trade.acceptedAmount || 0;
                        const feeBd = bidAmount > 0 ? calculateFees(bidAmount, 'fresh_produce') : null;
                        return (
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-[16px] p-4 border border-purple-200 space-y-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Receipt size={12} className="text-purple-600" />
                              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">You'll Pay</p>
                            </div>
                            <p className="text-2xl font-black text-purple-900">
                              {feeBd ? formatINR(feeBd.totalPayable) : `₹${bidAmount.toLocaleString('en-IN')}`}
                            </p>
                            {feeBd && (
                              <div className="space-y-1 pt-1 border-t border-purple-200">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-purple-500">Bid Amount</span>
                                  <span className="font-semibold text-purple-700">{formatINR(feeBd.baseAmount)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-purple-500">GST</span>
                                  <span className="font-semibold text-green-600">Exempt</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-purple-500">Platform Fee + GST</span>
                                  <span className="font-semibold text-purple-700">{formatINR(feeBd.convenienceFee + feeBd.convenienceFeeGST)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Active Trades / Status Section */}
                      {trade.tradeStatus === 'accepted' && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-[16px] border border-amber-200 p-4 flex items-start gap-3">
                          <TrendingUp size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-900">Ready for Payment</p>
                            <p className="text-xs text-amber-700 mt-0.5">Farmer accepted your bid. Proceed to secure payment</p>
                          </div>
                        </div>
                      )}
                      {trade.tradeStatus === 'confirmed' && (
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-[16px] border border-emerald-200 p-4 flex items-start gap-3">
                          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-emerald-900">Trade Completed</p>
                            <p className="text-xs text-emerald-700 mt-0.5">Payment confirmed and trade completed successfully</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    {trade.tradeStatus === 'accepted' && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                        <button
                          onClick={() => handleConfirmTrade(trade)}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-[12px] font-bold hover:shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                        >
                          <CheckCircle size={16} />
                          Proceed to Payment
                        </button>
                        <button
                          onClick={() => handleDeclineTrade()}
                          className="px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-[12px] font-bold hover:bg-red-50 transition-all duration-200 text-sm"
                          title="Decline trade"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedTrade && showPayment && (
        <TradePaymentModal
          trade={selectedTrade}
          onClose={() => {
            setShowPayment(false);
            setSelectedTrade(null);
          }}
          onPaymentComplete={handlePaymentComplete}
          token={token || ''}
          apiUrl={API}
        />
      )}
    </>
  );
};

export default BuyerTradesModal;
