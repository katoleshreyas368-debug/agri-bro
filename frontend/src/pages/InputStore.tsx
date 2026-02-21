import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Truck, Shield, Search, BarChart3, TrendingUp, AlertTriangle, X, Plus, SlidersHorizontal, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight, Eye, Star } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import AddInputModal from '../components/AddInputModal';

/* ============================================================
   InputStore Page — Modern E-Commerce Layout
   ============================================================ */
const ITEMS_PER_PAGE = 9;

const InputStore: React.FC = () => {
  const { inputItems, error, clearError } = useData();
  const { isAuthenticated, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddInput, setShowAddInput] = useState(false);
  const [cart, setCart] = useState<Array<{ id: string; quantity: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'name' | 'stock'>('price');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: 'All Products', color: 'bg-gray-100 text-gray-700' },
    { value: 'seeds', label: 'Seeds', color: 'bg-brand-green-light text-brand-green' },
    { value: 'fertilizers', label: 'Fertilizers', color: 'bg-blue-50 text-blue-700' },
    { value: 'pesticides', label: 'Pesticides', color: 'bg-orange-50 text-orange-700' },
  ];

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, sortBy]);

  /* ── filter & sort ── */
  const filteredItems = inputItems
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return a.price - b.price;
        case 'name': return a.name.localeCompare(b.name);
        case 'stock': return Number(b.inStock) - Number(a.inStock);
        default: return a.price - b.price;
      }
    });

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ── unique vendor names for sidebar ── */
  const vendorNames = Array.from(new Set(inputItems.map(i => i.vendorName)));
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());

  const toggleVendor = (name: string) => {
    setSelectedVendors(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
    setCurrentPage(1);
  };

  // Apply vendor filter
  const displayItems = selectedVendors.size > 0
    ? paginatedItems.filter(i => selectedVendors.has(i.vendorName))
    : paginatedItems;

  /* ── cart ── */
  const addToCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item =>
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
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

  const getCartCount = () => cart.reduce((t, c) => t + c.quantity, 0);

  /* ── stats ── */
  const totalProducts = inputItems.length;
  const inStockCount = inputItems.filter(i => i.inStock).length;
  const categoryCount = new Set(inputItems.map(i => i.category)).size;

  return (
    <div className="min-h-screen bg-brand-surface">
      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center max-w-7xl mx-auto w-full">
            <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HERO / HEADER
          ══════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="page-header__label">Input Store</p>
              <h1 className="page-header__title">Input Procurement Hub</h1>
              <p className="page-header__subtitle">Certified seeds, fertilizers, and agrochemicals delivered to your doorstep</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, vendors..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition"
                />
              </div>

              {isAuthenticated && user?.type === 'vendor' && (
                <button
                  onClick={() => setShowAddInput(true)}
                  className="bg-brand-green text-white pl-4 pr-5 py-2.5 rounded-xl font-semibold hover:bg-brand-green-dark transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> Add Product
                </button>
              )}
            </div>
          </div>

          {/* ── Horizontal Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total Products', value: totalProducts, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'In Stock', value: inStockCount, icon: TrendingUp, color: 'text-brand-green', bg: 'bg-brand-green-light' },
              { label: 'Categories', value: categoryCount, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Cart Items', value: getCartCount(), icon: ShoppingCart, color: 'text-brand-gold', bg: 'bg-yellow-50' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Feature Badges ── */}
          <div className="flex flex-wrap gap-4 mt-6">
            {[
              { icon: Shield, label: 'Certified Products', color: 'text-brand-green', bg: 'bg-brand-green-light' },
              { icon: Truck, label: 'Fast Delivery', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Package, label: 'Bulk Orders', color: 'text-orange-600', bg: 'bg-orange-50' },
              { icon: Star, label: 'Top Quality', color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-full">
                <div className={`p-1 rounded-full ${feat.bg}`}>
                  <feat.icon className={`h-3.5 w-3.5 ${feat.color}`} />
                </div>
                <span className="text-xs font-semibold text-gray-700">{feat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT: SIDEBAR + GRID
          ══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── Left Sidebar ── */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 p-6 transform transition-transform duration-300 lg:static lg:translate-x-0 lg:w-64 lg:flex-shrink-0 lg:rounded-xl lg:border lg:border-gray-200 lg:h-fit lg:sticky lg:top-24
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            {/* Mobile close */}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Filters</h3>

            {/* Category Filter */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat.value
                      ? 'bg-brand-green text-white ring-2 ring-brand-green ring-offset-1'
                      : cat.color + ' hover:opacity-80'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vendor (checkboxes) */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vendor</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {vendorNames.map(name => (
                  <label key={name} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedVendors.has(name)}
                      onChange={() => toggleVendor(name)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-green focus:ring-brand-green cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-brand-green transition-colors truncate">{name}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {inputItems.filter(i => i.vendorName === name).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stock Filter */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Availability</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('stock')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sortBy === 'stock'
                    ? 'bg-brand-green text-white'
                    : 'bg-brand-green-light text-brand-green hover:opacity-80'
                    }`}
                >
                  In Stock First
                </button>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sort By</p>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-green appearance-none cursor-pointer"
                >
                  <option value="price">Lowest Price</option>
                  <option value="name">Name A-Z</option>
                  <option value="stock">Stock Level</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </aside>

          {/* Sidebar overlay (mobile) */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-30 lg:hidden" />
          )}

          {/* ── Right Content Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <SlidersHorizontal className="h-4 w-4 text-gray-600" />
                </button>
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-900">{displayItems.length}</span> of <span className="font-semibold text-gray-900">{filteredItems.length}</span> products
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="border-none bg-transparent text-brand-green font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="price">Price ↑</option>
                  <option value="name">Name A-Z</option>
                  <option value="stock">Stock ↓</option>
                </select>
              </div>
            </div>

            {/* ── Product Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayItems.map(item => {
                const isHovered = hoveredCard === item.id;
                const cartQty = cart.find(c => c.id === item.id)?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredCard(item.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:border-brand-green hover:-translate-y-1"
                    style={{ boxShadow: isHovered ? '0 12px 32px rgba(46,125,50,0.10)' : '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden h-52">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Stock badge */}
                      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-sm ${item.inStock
                        ? 'bg-brand-green/90 text-white'
                        : 'bg-red-600/90 text-white'
                        }`}>
                        {item.inStock ? 'In Stock' : 'Out of Stock'}
                      </div>

                      {/* Category badge */}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold capitalize">
                        {item.category}
                      </div>

                      {/* Price badge (bottom-right of image) */}
                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-gray-100">
                        <span className="text-lg font-bold text-brand-green">₹{item.price}</span>
                        <span className="text-[10px] text-gray-500 block leading-tight">{item.unit}</span>
                      </div>

                      {/* Quick add-to-cart on hover */}
                      {isAuthenticated && item.inStock && (
                        <button
                          onClick={() => addToCart(item.id)}
                          className="absolute bottom-3 left-3 bg-brand-green text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 leading-snug">{item.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">by {item.vendorName}</p>
                        </div>
                        {cartQty > 0 && (
                          <span className="bg-brand-green-light text-brand-green text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {cartQty} in cart
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.description}</p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Shield className="h-3.5 w-3.5 text-brand-green" />
                          <span className="text-xs">Certified</span>
                        </div>
                        {isAuthenticated && item.inStock ? (
                          <button
                            onClick={() => addToCart(item.id)}
                            className="bg-brand-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-brand-green-dark transition-colors flex items-center gap-1.5"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" /> Add
                          </button>
                        ) : !item.inStock ? (
                          <span className="text-xs text-red-500 font-semibold">Unavailable</span>
                        ) : (
                          <button className="text-xs text-brand-green font-semibold flex items-center gap-1 hover:underline">
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom accent bar */}
                    <div className="h-[3px] bg-brand-green scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {displayItems.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <Package className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Products Found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
              </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:border-brand-green hover:text-brand-green disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${currentPage === page
                      ? 'bg-brand-green text-white'
                      : 'text-gray-600 hover:bg-brand-green-light hover:text-brand-green'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:border-brand-green hover:text-brand-green disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating Cart Summary ── */}
      {cart.length > 0 && (
        <div
          className="fixed bottom-6 right-6 bg-white rounded-2xl border border-gray-200 p-5 z-50 w-72 transition-all duration-300"
          style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-brand-green-light">
              <ShoppingCart className="h-5 w-5 text-brand-green" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Cart Summary</h3>
              <p className="text-xs text-gray-500">{getCartCount()} items</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-xl font-bold text-brand-green">₹{getCartTotal()}</span>
            </div>
          </div>
          <button className="w-full bg-brand-green text-white py-2.5 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors text-sm">
            Checkout
          </button>
        </div>
      )}

      {/* ── Add Input Modal ── */}
      {showAddInput && <AddInputModal onClose={() => setShowAddInput(false)} />}
    </div>
  );
};

export default InputStore;