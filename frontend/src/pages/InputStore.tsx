import React, { useState } from 'react';
import { ShoppingCart, Package, Truck, Shield, Search, Filter, BarChart3, TrendingUp, AlertTriangle, X, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import AddInputModal from '../components/AddInputModal';

interface InputItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  imageUrl: string;
  vendorName: string;
  inStock: boolean;
  stockQuantity?: number;
}

const InputStore: React.FC = () => {
  const { inputItems, error, clearError } = useData();
  const { isAuthenticated, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddInput, setShowAddInput] = useState(false);
  const [cart, setCart] = useState<Array<{ id: string; quantity: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'name' | 'stock'>('price');

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'seeds', label: 'Seeds' },
    { value: 'fertilizers', label: 'Fertilizers' },
    { value: 'pesticides', label: 'Pesticides' }
  ];

  // No need for unused statistics variables

  // Filter and sort items
  const filteredItems = inputItems
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stock':
          return Number(b.inStock) - Number(a.inStock);
        default:
          return a.price - b.price;
      }
    });

  const addToCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: itemId, quantity: 1 }];
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, cartItem) => {
      const item = inputItems.find(i => i.id === cartItem.id);
      return total + (item ? item.price * cartItem.quantity : 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex justify-between items-center shadow-md">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3" />
              <div>
                <p className="font-bold">An error occurred</p>
                <p>{error}</p>
              </div>
            </div>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Input Procurement Hub</h1>
            <p className="text-gray-600 max-w-2xl">
              Get certified seeds, fertilizers, and agrochemicals delivered to your doorstep
            </p>
          </div>
          {isAuthenticated && user?.type === 'vendor' && (
            <button
              onClick={() => setShowAddInput(true)}
              className="mt-4 sm:mt-0 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Product
            </button>
          )}
        </div>

        {/* Market Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{inputItems.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Available Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inputItems.filter(item => item.inStock).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length - 1}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Cart Items</p>
                <p className="text-2xl font-bold text-gray-900">{cart.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Certified Products</h3>
            <p className="text-sm text-gray-600">Quality assured inputs</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Fast Delivery</h3>
            <p className="text-sm text-gray-600">Direct to your farm</p>
          </div>
          <div className="text-center">
            <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Bulk Orders</h3>
            <p className="text-sm text-gray-600">Better prices for bulk</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Easy Ordering</h3>
            <p className="text-sm text-gray-600">Simple checkout process</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products or vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="price">Price</option>
                <option value="name">Name</option>
                <option value="stock">Stock Level</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {item.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₹{item.price}</span>
                    <span className="text-gray-500 text-sm ml-1">{item.unit}</span>
                  </div>
                  <span className="text-sm text-gray-500">by {item.vendorName}</span>
                </div>
                {isAuthenticated && item.inStock && (
                  <button
                    onClick={() => addToCart(item.id)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
            <h3 className="font-semibold mb-2">Cart Summary</h3>
            <p className="text-sm text-gray-600">{cart.length} items</p>
            <p className="text-lg font-bold text-green-600">Total: ₹{getCartTotal()}</p>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors mt-2">
              Checkout
            </button>
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-600">Try selecting a different category</p>
          </div>
        )}

        {/* Add Input Modal */}
        {showAddInput && (
          <AddInputModal onClose={() => setShowAddInput(false)} />
        )}
      </div>
    </div>
  );
};

export default InputStore;