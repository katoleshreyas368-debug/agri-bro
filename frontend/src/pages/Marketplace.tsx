import React, { useState, useRef, useEffect } from 'react';
import { Clock, MapPin, TrendingUp, Plus, Gavel, Search, Users, AlertTriangle, X, SlidersHorizontal, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import AddCropModal from '../components/AddCropModal';
import BidModal from '../components/BidModal';
import CropImage from '../components/CropImage';

/* ============================================================
   Custom Rupee Icon
   ============================================================ */
const RupeeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/* ============================================================
   Marketplace Page
   ============================================================ */
const ITEMS_PER_PAGE = 9;

const Marketplace: React.FC = () => {
  const { crops, error, clearError } = useData();
  const { user, isAuthenticated } = useAuth();
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'time' | 'bids'>('time');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, sortBy]);

  /* ── helpers ── */
  const formatTimeRemaining = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
  };

  /* ── filter & sort ── */
  const filteredCrops = crops
    .filter(crop => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = crop.name.toLowerCase().includes(q) ||
        crop.location.toLowerCase().includes(q) ||
        crop.farmerName.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || crop.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return b.currentBid - a.currentBid;
        case 'bids': return b.bids.length - a.bids.length;
        default: return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      }
    });

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(filteredCrops.length / ITEMS_PER_PAGE));
  const paginatedCrops = filteredCrops.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ── stats ── */
  const totalCrops = crops.length;
  const activeCrops = crops.filter(c => c.status === 'active').length;
  const totalBids = crops.reduce((s, c) => s + c.bids.length, 0);
  const avgPrice = crops.length > 0 ? Math.round(crops.reduce((s, c) => s + c.currentBid, 0) / crops.length) : 0;

  /* ── unique crop names for filter sidebar ── */
  const cropNames = Array.from(new Set(crops.map(c => c.name)));
  const [selectedCropNames, setSelectedCropNames] = useState<Set<string>>(new Set());

  const toggleCropName = (name: string) => {
    setSelectedCropNames(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
    setCurrentPage(1);
  };

  // Apply crop-name filter
  const displayCrops = selectedCropNames.size > 0
    ? paginatedCrops.filter(c => selectedCropNames.has(c.name))
    : paginatedCrops;

  const statusOptions: { value: typeof filterStatus; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
    { value: 'active', label: 'Active', color: 'bg-brand-green-light text-brand-green' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-50 text-blue-700' },
    { value: 'expired', label: 'Expired', color: 'bg-red-50 text-red-700' },
  ];

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
              <p className="page-header__label">Marketplace</p>
              <h1 className="page-header__title">Crop Marketplace</h1>
              <p className="page-header__subtitle">Transparent bidding for fair crop prices</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search (prominent) */}
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search crops, farmers..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition"
                />
              </div>

              {isAuthenticated && user?.type === 'farmer' && (
                <button
                  onClick={() => setShowAddCrop(true)}
                  className="bg-brand-green text-white pl-4 pr-5 py-2.5 rounded-xl font-semibold hover:bg-brand-green-dark transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> List Crop
                </button>
              )}
            </div>
          </div>

          {/* ── Horizontal Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total Crops', value: totalCrops, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Active Auctions', value: activeCrops, icon: Gavel, color: 'text-brand-green', bg: 'bg-brand-green-light' },
              { label: 'Total Bids', value: totalBids, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Avg Price', value: `₹${avgPrice}`, icon: RupeeIcon, color: 'text-brand-gold', bg: 'bg-yellow-50' },
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

            {/* Status Filter */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterStatus === opt.value
                      ? 'bg-brand-green text-white ring-2 ring-brand-green ring-offset-1'
                      : opt.color + ' hover:opacity-80'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop Types (checkboxes) */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Crop Type</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cropNames.map(name => (
                  <label key={name} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCropNames.has(name)}
                      onChange={() => toggleCropName(name)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-green focus:ring-brand-green cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-brand-green transition-colors">{name}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {crops.filter(c => c.name === name).length}
                    </span>
                  </label>
                ))}
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
                  <option value="time">Time Left</option>
                  <option value="price">Highest Price</option>
                  <option value="bids">Most Bids</option>
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
                  Showing <span className="font-semibold text-gray-900">{displayCrops.length}</span> of <span className="font-semibold text-gray-900">{filteredCrops.length}</span> crops
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="border-none bg-transparent text-brand-green font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="time">Time Left</option>
                  <option value="price">Price ↓</option>
                  <option value="bids">Bids ↓</option>
                </select>
              </div>
            </div>

            {/* ── Product Grid ── */}
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayCrops.map(crop => {
                const isHovered = hoveredCard === crop.id;
                const priceUp = Math.round(((crop.currentBid - crop.basePrice) / crop.basePrice) * 100);

                return (
                  <div
                    key={crop.id}
                    onMouseEnter={() => setHoveredCard(crop.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:border-brand-green hover:-translate-y-1"
                    style={{ boxShadow: isHovered ? '0 12px 32px rgba(46,125,50,0.10)' : '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden h-52">
                      <CropImage
                        src={crop.imageUrl}
                        alt={crop.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        fallbackSrc="/images/crops/Wheat.jpg"
                      />

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Status badge */}
                      <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-sm ${crop.status === 'active'
                        ? 'bg-brand-green/90 text-white'
                        : crop.status === 'completed'
                          ? 'bg-blue-600/90 text-white'
                          : 'bg-red-600/90 text-white'
                        }`}>
                        {crop.status}
                      </div>

                      {/* Bids count */}
                      {crop.bids.length > 0 && (
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Gavel className="h-3 w-3" /> {crop.bids.length}
                        </div>
                      )}

                      {/* Price badge (bottom-right of image) */}
                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-gray-100">
                        <span className="text-lg font-bold text-brand-green">₹{crop.currentBid}</span>
                        <span className="text-[10px] text-gray-500 block leading-tight">/quintal</span>
                      </div>

                      {/* Quick-view on hover */}
                      {isAuthenticated && user?.type === 'buyer' && crop.status === 'active' && (
                        <button
                          onClick={() => setSelectedCrop(crop.id)}
                          className="absolute bottom-3 left-3 bg-brand-green text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                        >
                          <Gavel className="h-3.5 w-3.5" /> Place Bid
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 leading-snug">{crop.name}</h3>
                          <p className="text-sm text-gray-500">{crop.quantity} {crop.unit}</p>
                        </div>
                        {priceUp > 0 && (
                          <span className="bg-brand-green-light text-brand-green text-[11px] font-bold px-2 py-0.5 rounded-full">
                            +{priceUp}%
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center text-gray-500 text-sm">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{crop.location}</span>
                        </div>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Clock className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          <span>{formatTimeRemaining(crop.endTime)}</span>
                        </div>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{crop.farmerName}</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">Base: ₹{crop.basePrice}</p>
                        {isAuthenticated && user?.type === 'buyer' && crop.status === 'active' ? (
                          <button
                            onClick={() => setSelectedCrop(crop.id)}
                            className="bg-brand-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-brand-green-dark transition-colors flex items-center gap-1.5"
                          >
                            <Gavel className="h-3.5 w-3.5" /> Bid Now
                          </button>
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
            {displayCrops.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <TrendingUp className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Crops Found</h3>
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

      {/* ── Modals ── */}
      {showAddCrop && <AddCropModal onClose={() => setShowAddCrop(false)} />}
      {selectedCrop && <BidModal cropId={selectedCrop} onClose={() => setSelectedCrop(null)} />}
    </div>
  );
};

export default Marketplace;