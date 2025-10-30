import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Crop } from '../contexts/DataContext';
import { Package, Edit, Trash2, Plus } from 'lucide-react';

const MyListings: React.FC = () => {
  const { token } = useAuth();
  const [myCrops, setMyCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    const fetchMyListings = async () => {
      if (!token) {
        setLoading(false);
        setError("You must be logged in to view your listings.");
        return;
      }

      try {
        const res = await fetch(`${API}/crops/my-listings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch your listings.');
        }

        const data = await res.json();
        setMyCrops(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [token, API]);

  if (loading) {
    return <div className="text-center py-12">Loading your listings...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Crop Listings</h1>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            List New Crop
          </button>
        </div>

        {myCrops.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Listings Found</h3>
            <p className="text-gray-600">You haven't listed any crops for sale yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {myCrops.map(crop => (
                <li key={crop.id} className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{crop.name}</p>
                    <p className="text-sm text-gray-600">
                      {crop.quantity} {crop.unit} - Base Price: ₹{crop.basePrice}
                    </p>
                    <p className={`text-sm font-medium mt-1 ${crop.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                      Status: {crop.status}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;