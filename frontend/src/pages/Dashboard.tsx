import React, { Suspense } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  MessageCircle,
  Truck,
  DollarSign,
  Package
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const AgriMap = React.lazy(() => import('../components/AgriMap'));

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { crops, logisticsRequests, communityPosts } = useData();

  if (!user) return null;

  const userCrops = crops.filter(crop => crop.farmerId === user.id);
  const userLogistics = logisticsRequests.filter(req => req.farmerId === user.id);
  const userPosts = communityPosts.filter(post => post.authorId === user.id);

  const totalEarnings = userCrops.reduce((sum, crop) => {
    return crop.status === 'completed' ? sum + (crop.currentBid * crop.quantity) : sum;
  }, 0);

  const stats = [
    {
      title: 'Total Earnings',
      value: `₹${totalEarnings.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Auctions',
      value: userCrops.filter(c => c.status === 'active').length,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Transport Requests',
      value: userLogistics.length,
      icon: Truck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Community Posts',
      value: userPosts.length,
      icon: MessageCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-green-700">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-2 text-lg">Here’s your AGRIBro farming dashboard</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Crop Listings & Transport Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Crops */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-green-700 mb-4">Your Crop Listings</h2>
            {userCrops.length > 0 ? (
              <div className="space-y-4">
                {userCrops.slice(0, 3).map(crop => (
                  <div key={crop.id} className="flex items-center justify-between border p-4 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-800">{crop.name}</h3>
                      <p className="text-sm text-gray-500">{crop.quantity} {crop.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">₹{crop.currentBid}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${crop.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {crop.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No crop listings yet</p>
              </div>
            )}
          </div>

          {/* Logistics */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-green-700 mb-4">Transport Requests</h2>
            {userLogistics.length > 0 ? (
              <div className="space-y-4">
                {userLogistics.slice(0, 3).map(request => (
                  <div key={request.id} className="flex items-center justify-between border p-4 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-800">{request.cropType}</h3>
                      <p className="text-sm text-gray-500">{request.fromLocation} → {request.toLocation}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'matched' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No transport requests yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Logistics Map */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-12">
          <h2 className="text-xl font-semibold text-green-700 mb-4">Logistics Map</h2>
          <Suspense fallback={<div className="h-[500px] flex items-center justify-center text-gray-400">Loading map...</div>}>
            <AgriMap />
          </Suspense>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-green-700 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition">
              <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-800">List New Crop</p>
                <p className="text-sm text-gray-500">Start selling your harvest</p>
              </div>
            </button>
            <button className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition">
              <ShoppingCart className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-800">Buy Inputs</p>
                <p className="text-sm text-gray-500">Seeds, pesticides, etc.</p>
              </div>
            </button>
            <button className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition">
              <Truck className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-800">Request Transport</p>
                <p className="text-sm text-gray-500">Move your produce efficiently</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
