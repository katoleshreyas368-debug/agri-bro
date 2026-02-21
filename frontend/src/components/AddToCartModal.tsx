import React, { useState } from 'react';
import { X, ShoppingCart, Package, Shield, Minus, Plus } from 'lucide-react';

interface AddToCartModalProps {
    item: {
        id: string;
        name: string;
        price: number;
        unit: string;
        imageUrl: string;
        vendorName: string;
    };
    onClose: () => void;
    onConfirm: (quantity: number) => void;
}

const AddToCartModal: React.FC<AddToCartModalProps> = ({ item, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);

    const handleConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(quantity);
        onClose();
    };

    const totalAmount = item.price * quantity;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
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
                    <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em]">Product Procurement</span>
                    <h2 className="text-3xl font-black text-gray-900 mt-1">Add to Order</h2>
                </div>

                {/* Item Preview Card */}
                <div className="bg-gray-50 rounded-[24px] border border-gray-100 overflow-hidden mb-8">
                    <div className="relative h-32 w-full">
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                            <div>
                                <h3 className="text-white font-bold text-lg leading-tight">{item.name}</h3>
                                <p className="text-white/80 text-xs font-medium">by {item.vendorName}</p>
                            </div>
                            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Certified
                            </div>
                        </div>
                    </div>

                    <div className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                <Package className="text-brand-green" size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Standard Unit</p>
                                <p className="text-sm font-bold text-gray-900">{item.unit}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Price per unit</p>
                            <p className="text-lg font-black text-brand-green">₹{item.price}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleConfirm} className="space-y-6">
                    {/* Quantity Selector Section */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-3 text-center">Select Required Quantity</label>

                            <div className="flex items-center justify-center gap-6 bg-gray-50 rounded-[24px] p-6 border border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-green hover:border-brand-green/30 transition-all active:scale-90 shadow-sm"
                                >
                                    <Minus size={24} />
                                </button>

                                <div className="text-center min-w-[80px]">
                                    <span className="text-4xl font-black text-gray-900">{quantity}</span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Units</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:text-brand-green hover:border-brand-green/30 transition-all active:scale-90 shadow-sm"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Price Summary */}
                        <div className="bg-brand-green/5 rounded-[24px] p-6 border border-brand-green/10 space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-gray-500">Subtotal ({quantity} {item.unit})</span>
                                <span className="text-gray-900 font-bold">₹{item.price * quantity}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-gray-500">Service Fee</span>
                                <span className="text-brand-green font-bold">₹0.00</span>
                            </div>
                            <div className="h-px bg-brand-green/10 my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Cart Value</span>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-gray-900">₹{totalAmount}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        type="submit"
                        className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-brand-green/20 h-16 flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        <span>Confirm Addition</span>
                        <ShoppingCart size={20} />
                    </button>

                    <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <Shield size={12} className="text-brand-green" />
                        QC Checked & Verified Product
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

export default AddToCartModal;
