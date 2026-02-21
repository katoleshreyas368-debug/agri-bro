import React, { useState } from 'react';
import { X, Gavel, IndianRupee, Activity, Package, CheckCircle2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface BidModalProps {
  cropId: string;
  onClose: () => void;
}

const BidModal: React.FC<BidModalProps> = ({ cropId, onClose }) => {
  const { crops, addBid } = useData();
  const { user } = useAuth();
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const crop = crops.find(c => c.id === cropId);
  if (!crop) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseInt(bidAmount);
    if (amount <= crop.currentBid) {
      alert('Your bid must exceed the current highest bid.');
      return;
    }

    setIsSubmitting(true);
    // Simulate network delay for premium feel
    await new Promise(r => setTimeout(r, 800));

    addBid(cropId, {
      amount
    });

    setIsSubmitting(false);
    onClose();
  };

  const totalAmountValue = (parseInt(bidAmount) || 0) * crop.quantity;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] border border-gray-100 w-full max-w-lg max-h-[90vh] overflow-y-auto relative p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 CustomScrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-8">
          <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em]">Live Auction</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Place Your Bid</h2>
        </div>

        {/* Crop Preview Card */}
        <div className="bg-gray-50 rounded-[24px] border border-gray-100 overflow-hidden mb-8">
          <div className="relative h-32 w-full">
            <img
              src={crop.imageUrl}
              alt={crop.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">{crop.name}</h3>
                <p className="text-white/80 text-xs font-medium">{crop.location}</p>
              </div>
              <div className="bg-brand-green text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Active
              </div>
            </div>
          </div>

          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <Package className="text-brand-green" size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Lot Size</p>
                <p className="text-sm font-bold text-gray-900">{crop.quantity} {crop.unit}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Current Bid</p>
              <p className="text-lg font-black text-brand-green">₹{crop.currentBid}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bid Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2">Your Offer (per {crop.unit})</label>
              <div className="relative group">
                <input
                  type="number"
                  required
                  autoFocus
                  className="w-full h-16 pl-14 pr-6 bg-white border-2 border-gray-100 rounded-2xl text-xl font-black focus:border-brand-green focus:ring-4 focus:ring-brand-green/5 outline-none transition-all placeholder:text-gray-200"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={crop.currentBid + 1}
                  placeholder={`Min. ₹${crop.currentBid + 1}`}
                />
                <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-green group-focus-within:scale-110 transition-transform" size={24} />
              </div>
            </div>

            {/* Summary Information */}
            <div className="bg-brand-green/5 rounded-2xl p-5 border border-brand-green/10 space-y-3">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-gray-500">Lot Subtotal</span>
                <span className="text-gray-900">₹{(parseInt(bidAmount) || 0) * crop.quantity}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-gray-500">Handling Fee</span>
                <span className="text-brand-green">Free for Buyers</span>
              </div>
              <div className="h-px bg-brand-green/10 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Committed</span>
                <span className="text-xl font-black text-gray-900">₹{totalAmountValue}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || !bidAmount}
            className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50 h-16 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Activity className="animate-spin" size={20} />
                <span>Submitting Bid...</span>
              </>
            ) : (
              <>
                <span>Commit Bid</span>
                <Gavel size={20} />
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <CheckCircle2 size={12} className="text-brand-green" />
            Binding agreement upon acceptance
          </p>
        </form>
      </div>

      <style>{`
        .CustomScrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .CustomScrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .CustomScrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .CustomScrollbar::-webkit-scrollbar-thumb:hover {
          background: #2e7d32;
        }
      `}</style>
    </div>
  );
};

export default BidModal;