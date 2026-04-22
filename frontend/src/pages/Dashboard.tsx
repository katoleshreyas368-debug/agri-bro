import React, { Suspense, useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Truck,
  Package,
  Activity,
  ArrowUpRight,
  ChevronRight,
  Download,
  Calendar,
  Zap,
  Star,
  LayoutGrid,
  Store,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AgriMap = React.lazy(() => import('../components/AgriMap'));

interface WeekBar { day: string; count: number; height: string; }
interface MarketItem { name: string; value: string; count: string; color: string; }
interface Pattern { id: number; title: string; count: string; color: string; }
interface PeakProductivity { label: string; time: string; focus: string; }
interface DashboardStats {
  weekBars: WeekBar[];
  peakChange: string;
  marketDistribution: MarketItem[];
  patterns: Pattern[];
  peakProductivity: PeakProductivity;
  totalItems: number;
}

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    if (user && window.location.pathname === '/dashboard') {
      navigate(`/dashboard/${user.type}`, { replace: true });
    }
  }, [user, navigate]);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API}/auth/history`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/auth/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (historyRes.ok) setHistory((await historyRes.json()).history);
      if (statsRes.ok) setDashStats(await statsRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, API]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const stats = useMemo(() => {
    if (!history || !user) return [];
    if (user.type === 'farmer') {
      const activeCrops = history.crops?.filter((c: any) => c.status === 'active')?.length || 0;
      return [
        { title: 'Active Listings', value: activeCrops, trend: 'Market', icon: Package, color: 'text-brand-green', iconBg: 'bg-brand-green-light', label: 'Produce' },
        { title: 'Logistics Queue', value: history.logisticsRequests?.length || 0, trend: 'System', icon: Truck, color: 'text-purple-500', iconBg: 'bg-purple-50', label: 'In Transit' },
        { title: 'Inputs Bought', value: history.inputsBought?.length || 0, trend: 'Orders', icon: ShoppingCart, color: 'text-blue-500', iconBg: 'bg-blue-50', label: 'Purchases' }
      ];
    } else if (user.type === 'vendor') {
      return [
        { title: 'Store Items', value: history.inputs?.length || 0, trend: 'Selling', icon: Store, color: 'text-brand-green', iconBg: 'bg-brand-green-light', label: 'Inventory' }
      ];
    } else if (user.type === 'buyer') {
      return [
        { title: 'Purchased Crops', value: history.cropsBought?.length || 0, trend: 'Done', icon: Package, color: 'text-brand-green', iconBg: 'bg-brand-green-light', label: 'Orders' },
        { title: 'Logistics Requests', value: history.logisticsRequests?.length || 0, trend: 'Routes', icon: Truck, color: 'text-purple-500', iconBg: 'bg-purple-50', label: 'Shipping' }
      ];
    } else if (user.type === 'transporter') {
      return [
        { title: 'Assigned Jobs', value: history.logisticsRequests?.length || 0, trend: 'Pending', icon: Truck, color: 'text-brand-green', iconBg: 'bg-brand-green-light', label: 'Deliveries' }
      ];
    }
    return [];
  }, [history, user]);

  // ── Navigation helpers ──
  const logisticsPath = useMemo(() => {
    if (!user) return '/logistics';
    return `/logistics/${user.type}`;
  }, [user]);

  const handleExportAnalytics = useCallback(() => {
    if (!history || !user) return;
    const rows: string[][] = [['Section', 'Item', 'Details']];
    stats.forEach(s => rows.push(['Stats', s.title, String(s.value)]));
    if (dashStats?.marketDistribution) {
      dashStats.marketDistribution.forEach(m => rows.push(['Market', m.name, `${m.value} (${m.count})`]));
    }
    if (dashStats?.patterns) {
      dashStats.patterns.forEach(p => rows.push(['Pattern', p.title, p.count]));
    }
    if (dashStats?.weekBars) {
      dashStats.weekBars.forEach(w => rows.push(['Weekly', w.day, String(w.count)]));
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agribro_${user.type}_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history, user, stats, dashStats]);

  if (!user) return null;

  // Fallback data when stats haven't loaded yet
  const weekBars = dashStats?.weekBars || [
    { day: 'Mon', count: 0, height: '5%' }, { day: 'Tue', count: 0, height: '5%' },
    { day: 'Wed', count: 0, height: '5%' }, { day: 'Thu', count: 0, height: '5%' },
    { day: 'Fri', count: 0, height: '5%' }, { day: 'Sat', count: 0, height: '5%' },
    { day: 'Sun', count: 0, height: '5%' }
  ];
  const marketDist = dashStats?.marketDistribution || [];
  const patterns = dashStats?.patterns || [];
  const peakProd = dashStats?.peakProductivity || { label: 'Loading...', time: '—', focus: '—' };
  const peakChange = dashStats?.peakChange || '—';

  // Skeleton pulse component
  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-100 rounded-2xl ${className}`} />
  );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-brand-surface font-poppins text-gray-900 pb-20">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-12">

        {/* ── Top Navigation Bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-green bg-brand-green-light px-3 py-1 rounded-full">System Active</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none flex items-center gap-2">
                <Calendar size={12} className="text-gray-300" /> {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-950">Welcome, <span className="text-brand-green">{user.name}</span>!</h1>
            <p className="text-sm text-gray-400 font-medium mt-1 uppercase tracking-widest">{user.type} Dashboard</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportAnalytics}
              className="flex items-center gap-2.5 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={16} className="text-gray-400" />
              Export Analytics
            </button>
          </div>
        </div>

        {/* ── Visual Stats Summary ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)
          ) : (
            stats.map((stat) => (
              <div key={stat.title} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
                onClick={() => {
                  if (stat.title.includes('Listing')) navigate('/marketplace');
                  else if (stat.title.includes('Logistics') || stat.title.includes('Jobs')) navigate(logisticsPath);
                  else if (stat.title.includes('Inputs') || stat.title.includes('Store')) navigate('/inputs');
                  else if (stat.title.includes('Purchased')) navigate('/marketplace');
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className={`p-4 rounded-2xl ${stat.iconBg} ${stat.color} transition-transform group-hover:scale-110`}>
                      <stat.icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface rounded-full">
                      <span className={`text-[10px] font-black ${stat.color}`}>{stat.trend}</span>
                      <ArrowUpRight size={10} className={stat.color} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-3xl font-black text-gray-950 tracking-tighter">{stat.value}</p>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{stat.title}</h3>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{stat.label}</p>
                  </div>
                </div>
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${stat.iconBg} opacity-10 group-hover:scale-150 transition-transform`} />
              </div>
            ))
          )}
        </div>

        {/* ── Main Analytics Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Weekly Activity Bar Chart */}
          <div className="lg:col-span-7 bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Yield Velocity</h2>
                <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">Operational volume over the past 7 days</p>
              </div>
              <div className="flex items-center gap-2 text-brand-green bg-brand-green-light px-3 py-1.5 rounded-xl">
                <Activity size={14} />
                <span className="text-[10px] font-black uppercase">{peakChange}</span>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-4 h-64 px-4 pb-4 border-b border-gray-50 mb-6">
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="flex-1 h-16" />)
              ) : (
                weekBars.map((bar, idx) => (
                  <div
                    key={bar.day}
                    className="flex-1 flex flex-col items-center group relative"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip */}
                    {hoveredBar === idx && (
                      <div className="absolute -top-10 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg z-10 whitespace-nowrap">
                        {bar.count} {bar.count === 1 ? 'item' : 'items'}
                      </div>
                    )}
                    <div
                      className="w-full bg-gradient-to-t from-brand-green/20 to-brand-green/80 rounded-[20px] transition-all duration-700 group-hover:to-brand-green group-hover:shadow-lg shadow-brand-green/20"
                      style={{ height: bar.height, minHeight: '12px' }}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-4 text-gray-400 group-hover:text-gray-900 transition-colors">{bar.day}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Distribution Analysis */}
          <div className="lg:col-span-5 bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
            <div className="mb-10">
              <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Market Distribution</h2>
              <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">
                {user.type === 'farmer' ? 'Your most common crop listings' :
                 user.type === 'vendor' ? 'Your top store items' :
                 user.type === 'buyer' ? 'Your top purchases' : 'Your delivery types'}
              </p>
            </div>

            <div className="space-y-8">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)
              ) : marketDist.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No data yet</p>
                  <p className="text-[10px] text-gray-300 mt-1">Start {user.type === 'farmer' ? 'listing crops' : user.type === 'vendor' ? 'adding items' : 'trading'} to see distribution</p>
                </div>
              ) : (
                marketDist.map((item) => (
                  <div key={item.name} className="space-y-3 group cursor-pointer">
                    <div className="flex justify-between items-center text-xs font-bold px-1">
                      <span className="text-gray-900 uppercase tracking-widest group-hover:text-brand-green transition-colors">{item.name}</span>
                      <span className="text-gray-400">{item.count}</span>
                    </div>
                    <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.value }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Logistics & Patterns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Identified Patterns / Suggestions */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm flex-1">
              <div className="mb-8">
                <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">System Patterns</h2>
                <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">Activity insights from your data</p>
              </div>

              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                ) : (
                  patterns.map(pattern => (
                    <div key={pattern.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-white border border-transparent hover:border-gray-100 transition-all">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 ${pattern.color} text-[10px] font-black text-white flex items-center justify-center rounded-xl shadow-lg shadow-gray-200`}>
                          {pattern.id}
                        </span>
                        <span className="text-sm font-bold text-gray-900 tracking-tight">{pattern.title}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-400">{pattern.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Peak Productivity */}
            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Peak Productivity Window</h3>
              <div className="flex items-center justify-between p-4 bg-brand-surface rounded-[24px]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-green rounded-2xl text-white shadow-lg shadow-brand-green/20">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase text-gray-950">{peakProd.label}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{peakProd.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-brand-green uppercase tracking-widest">{peakProd.focus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics / Progress Visualization */}
          <div className="lg:col-span-7 relative h-full">
            <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Your Progress</h2>
                  <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Snapshot
                  </p>
                </div>
                <LayoutGrid className="text-gray-200" />
              </div>

              <div className="relative flex-1 rounded-[32px] overflow-hidden group min-h-[300px]">
                <div className="absolute inset-0 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none">
                  <Suspense fallback={<div className="h-full w-full bg-gray-50 flex items-center justify-center"><Activity className="animate-pulse" /></div>}>
                    <AgriMap />
                  </Suspense>
                </div>

                {/* Gradient Card with Stats */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#8e44ad] via-[#9b59b6] to-[#e67e22] rounded-[32px] p-10 flex flex-col justify-end shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-10 grayscale invert pointer-events-none">
                    <Suspense fallback={null}>
                      <AgriMap />
                    </Suspense>
                  </div>

                  <div className="relative z-10 flex items-end justify-between gap-12 text-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-6">
                        <Star size={16} fill="currentColor" className="text-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
                          Operational Grade {(dashStats?.totalItems || 0) >= 10 ? 'A+' : (dashStats?.totalItems || 0) >= 5 ? 'A' : (dashStats?.totalItems || 0) >= 1 ? 'B+' : 'Starter'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Items Processed</p>
                          <p className="text-4xl font-black tracking-tight text-white">
                            {loading ? <Loader2 className="animate-spin" size={28} /> : (dashStats?.totalItems || 0)}
                          </p>
                          <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-widest">Recorded</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Actions</p>
                          <p className="text-4xl font-black tracking-tight text-white">{(dashStats?.totalItems || 0) > 0 ? 'ACTIVE' : 'READY'}</p>
                          <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-widest">{(dashStats?.totalItems || 0) > 0 ? 'In Progress' : 'Standing By'}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(logisticsPath)}
                      className="p-5 bg-white text-gray-950 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
                      title="View Logistics"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                <p className="text-xs font-bold text-gray-900 italic">
                  {(dashStats?.totalItems || 0) > 5
                    ? `"Great progress, ${user.name}! Keep up the consistent sessions."`
                    : `"Welcome aboard, ${user.name}! Start by adding your first listing."`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions / Floating Command ── */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-auto max-w-[calc(100vw-32px)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-full px-4 sm:px-8 py-3 sm:py-4 flex items-center gap-4 sm:gap-8 shadow-2xl">
            <div className="flex items-center gap-4 sm:gap-6">
              <button onClick={() => navigate('/marketplace')} className="flex flex-col items-center gap-1 group min-w-[44px] min-h-[44px] justify-center">
                <Package size={18} className="text-gray-400 group-hover:text-brand-green transition-colors" />
                <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">
                  {user.type === 'farmer' ? 'List Crop' : 'Browse'}
                </span>
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button onClick={() => navigate('/inputs')} className="flex flex-col items-center gap-1 group min-w-[44px] min-h-[44px] justify-center">
                <ShoppingCart size={18} className="text-gray-400 group-hover:text-brand-green transition-colors" />
                <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">Buy Inputs</span>
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button onClick={() => navigate(logisticsPath)} className="flex flex-col items-center gap-1 group min-w-[44px] min-h-[44px] justify-center">
                <Truck size={18} className="text-gray-400 group-hover:text-brand-green transition-colors" />
                <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">Logistics</span>
              </button>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <button onClick={() => navigate('/advisor')} className="flex flex-col items-center gap-1 group min-w-[44px] min-h-[44px] justify-center">
              <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-green/40 group-hover:scale-110 transition-all">
                <LayoutGrid size={20} />
              </div>
            </button>
          </div>
        </div>
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
      `}
      </style>
    </div>
  );
};

export default Dashboard;
