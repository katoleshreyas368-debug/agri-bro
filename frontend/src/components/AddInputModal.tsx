import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface AddInputModalProps {
  onClose: () => void;
}

const AddInputModal: React.FC<AddInputModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const API = import.meta.env.VITE_API_URL;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'fertilizers',
    price: '',
    unit: '',
    stockQuantity: '',
    imageUrl: '',
    vendorName: user?.name || ''
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl = formData.imageUrl;

      // ✅ Step 1: Upload Image if selected
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

        if (!uploadResult.url) {
          throw new Error('No image URL received from server');
        }

        console.log('✅ Upload successful:', uploadResult);

        // 🔥 FIX: Make sure full URL is stored, not relative
        imageUrl = `${API}${uploadResult.url}`;
      }

      // ✅ Step 2: Prepare payload
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: Number(formData.price),
        unit: formData.unit.trim(),
        stockQuantity: Number(formData.stockQuantity),
        vendorName: formData.vendorName.trim(),
        imageUrl: imageUrl,
        inStock: true
      };

      // ✅ Step 3: Validate required fields before sending
      if (
        !payload.name ||
        !payload.description ||
        !payload.category ||
        !payload.price ||
        !payload.unit ||
        !payload.vendorName ||
        !payload.imageUrl
      ) {
        throw new Error('Please fill in all required fields');
      }

      console.log('📦 Sending payload:', payload);

      // ✅ Step 4: POST product data
      const response = await fetch(`${API}/inputs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('❌ Error response:', result);
        throw new Error(result.error || 'Failed to create product');
      }

      console.log('✅ Product created successfully:', result);
      window.alert('Product added successfully!');
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('❌ Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold mb-6">Add New Product</h2>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                <option value="fertilizers">Fertilizers</option>
                <option value="seeds">Seeds</option>
                <option value="pesticides">Pesticides</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input
                type="text"
                required
                placeholder="e.g., kg, L, 50kg bag"
                value={formData.unit}
                onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock Quantity</label>
              <input
                type="number"
                required
                min="0"
                value={formData.stockQuantity}
                onChange={e => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vendor Name</label>
              <input
                type="text"
                required
                value={formData.vendorName}
                onChange={e => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-1">Product Image</label>
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

          {/* Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInputModal;
