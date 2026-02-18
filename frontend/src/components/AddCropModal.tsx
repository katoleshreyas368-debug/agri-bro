import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
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

      // Upload image if selected
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

        // Use the returned URL from Cloudinary
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">List Your Crop</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crop Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Wheat, Rice"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                name="unit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                value={formData.unit}
                onChange={handleChange}
              >
                <option value="quintals">Quintals</option>
                <option value="tons">Tons</option>
                <option value="kg">Kilograms</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Price (₹ per quintal)
            </label>
            <input
              type="number"
              name="basePrice"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.basePrice}
              onChange={handleChange}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crop Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto h-32 w-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <label className="relative cursor-pointer text-green-600">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional URL input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or provide image URL (optional)
            </label>
            <input
              type="url"
              name="imageUrl"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auction End Date
            </label>
            <input
              type="datetime-local"
              name="endTime"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={formData.endTime}
              onChange={handleChange}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'List Crop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCropModal;