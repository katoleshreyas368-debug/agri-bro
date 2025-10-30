import React, { useState } from 'react';
import { Truck, MapPin, Calendar, Plus, CheckCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

const Logistics: React.FC = () => {
  const { logisticsRequests, addLogisticsRequest } = useData();
  const { user, isAuthenticated } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    cropType: '',
    quantity: '',
    fromLocation: '',
    toLocation: '',
    requestedDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // The backend will get the farmerId and farmerName from the auth middleware
    addLogisticsRequest({
      cropType: formData.cropType,
      quantity: parseInt(formData.quantity),
      fromLocation: formData.fromLocation,
      toLocation: formData.toLocation,
      status: 'pending',
      requestedDate: formData.requestedDate
    });

    setFormData({
      cropType: '',
      quantity: '',
      fromLocation: '',
      toLocation: '',
      requestedDate: ''
    });
    setShowRequestForm(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Logistics Hub</h1>
            <p className="text-gray-600 mt-2">Connect with transport services for your crops</p>
          </div>
          {isAuthenticated && user?.type === 'farmer' && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="mt-4 sm:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Request Transport
            </button>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reliable Transport</h3>
            <p className="text-gray-600">Verified logistics partners with good track record</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">GPS Tracking</h3>
            <p className="text-gray-600">Real-time tracking of your crop shipments</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quality Assurance</h3>
            <p className="text-gray-600">Temperature controlled vehicles for fresh produce</p>
          </div>
        </div>

        {/* Request Form Modal */}
        {showRequestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold">Request Transport</h2>
                <button 
                  onClick={() => setShowRequestForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop Type
                  </label>
                  <input
                    type="text"
                    name="cropType"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.cropType}
                    onChange={handleChange}
                    placeholder="e.g., Wheat, Rice"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (quintals)
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Location
                  </label>
                  <input
                    type="text"
                    name="fromLocation"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.fromLocation}
                    onChange={handleChange}
                    placeholder="Pickup location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Location
                  </label>
                  <input
                    type="text"
                    name="toLocation"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.toLocation}
                    onChange={handleChange}
                    placeholder="Delivery location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    name="requestedDate"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.requestedDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Logistics Requests */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Recent Transport Requests</h2>
          
          {logisticsRequests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {logisticsRequests.map(request => (
                <div key={request.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{request.cropType}</h3>
                      <p className="text-gray-600">by {request.farmerName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="text-sm">{request.fromLocation} → {request.toLocation}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Truck className="h-4 w-4 mr-2" />
                      <span className="text-sm">{request.quantity} quintals</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="text-sm">Requested: {new Date(request.requestedDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        🔍 Searching for available transport services...
                      </p>
                    </div>
                  )}

                  {request.status === 'matched' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        🚛 Transport partner found! You will receive contact details soon.
                      </p>
                    </div>
                  )}

                  {request.status === 'completed' && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✅ Transport completed successfully!
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Transport Requests</h3>
              <p className="text-gray-600">Request transport services to move your crops efficiently</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logistics;