import React, { useState } from 'react';
import { X, Upload, IndianRupee, Package, Calendar, Activity, Link as LinkIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface AddCropModalProps {
  onClose: () => void;
}

const AddCropModal: React.FC<AddCropModalProps> = ({ onClose }) => {
  const { addCrop } = useData();
  const { user } = useAuth();
  const API = import.meta.env.VITE_API_URL;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'quintals',
    basePrice: '',
    imageUrl: '',
    endTime: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl = formData.imageUrl;

      if (selectedImage) {
        const formDataWithImage = new FormData();
        formDataWithImage.append('image', selectedImage);

        const uploadResponse = await fetch(`${API}/upload`, {
          method: 'POST',
          body: formDataWithImage
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Failed to upload image');
        }

        if (uploadResult.url && String(uploadResult.url).startsWith('http')) {
          imageUrl = uploadResult.url;
        } else if (uploadResult.url) {
          imageUrl = `${API}${uploadResult.url}`;
        }
      }

      const cropData = {
        name: formData.name,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        basePrice: parseInt(formData.basePrice),
        farmerId: user.id,
        farmerName: user.name,
        location: user.location,
        imageUrl: imageUrl || 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg',
        status: 'active' as const,
        endTime: new Date(formData.endTime).toISOString()
      };

      await addCrop(cropData);
      onClose();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add crop');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-y-auto relative p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 CustomScrollbar">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="mb-8">
          <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em]">Marketplace Listing</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">List Your Crop</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Crop Basics */}
          <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Crop Variety</label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Basmati Rice, Sharbati Wheat"
                />
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  required
                  className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Unit</label>
                <select
                  name="unit"
                  className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all cursor-pointer"
                  value={formData.unit}
                  onChange={handleChange}
                >
                  <option value="quintals">Quintals</option>
                  <option value="tons">Tons</option>
                  <option value="kg">Kilograms</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-brand-green/5 p-6 rounded-[24px] border border-brand-green/10">
              <label className="block text-[10px] font-bold text-brand-green uppercase tracking-widest mb-2">Base Price (₹)</label>
              <div className="relative">
                <input
                  type="number"
                  name="basePrice"
                  required
                  className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                  value={formData.basePrice}
                  onChange={handleChange}
                  placeholder="0.00"
                />
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-green" size={18} />
              </div>
              <p className="text-[10px] text-brand-green/60 mt-2 font-medium">Per selected unit</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Auction End Date</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="endTime"
                  required
                  className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all"
                  value={formData.endTime}
                  onChange={handleChange}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              </div>
            </div>
          </div>

          {/* Media Section */}
          <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Crop Imagery</label>

            <div className="flex flex-col gap-4">
              <div className={`relative border-2 border-dashed rounded-[20px] transition-all flex flex-col items-center justify-center p-6 ${imagePreview ? 'border-brand-green bg-brand-green/5' : 'border-gray-200 bg-white hover:border-brand-green/50'
                }`}>
                {imagePreview ? (
                  <div className="relative group w-full">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-xl shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="text-gray-400" size={20} />
                    </div>
                    <label className="cursor-pointer">
                      <span className="text-sm font-bold text-brand-green hover:underline">Upload High-Res Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">RAW, JPG or PNG (Max 5MB)</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="url"
                  name="imageUrl"
                  className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="Or paste external image URL..."
                />
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl text-sm flex items-center gap-3">
              <Activity className="flex-shrink-0" size={18} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50 h-16 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Activity className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Publish Listing</span>
                <Package size={20} />
              </>
            )}
          </button>
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

export default AddCropModal;
