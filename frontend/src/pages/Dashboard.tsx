import React, { Suspense, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  MessageCircle,
  Truck,
  DollarSign,
  Package,
  Activity,
  ArrowUpRight,
  ChevronRight,
  Download,
  Calendar,
  Zap,
  Star,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const AgriMap = React.lazy(() => import('../components/AgriMap'));

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { crops, logisticsRequests, communityPosts } = useData();

  const userCrops = useMemo(() => crops.filter(crop => crop.farmerId === user?.id), [crops, user]);
  const userLogistics = useMemo(() => logisticsRequests.filter(req => req.farmerId === user?.id), [logisticsRequests, user]);
  const userPosts = useMemo(() => communityPosts.filter(post => post.authorId === user?.id), [communityPosts, user]);

  const totalEarnings = useMemo(() => userCrops.reduce((sum, crop) => {
    return crop.status === 'completed' ? sum + (crop.currentBid * crop.quantity) : sum;
  }, 0), [userCrops]);

  if (!user) return null;

  const stats = [
    {
      title: 'Gross Revenue',
      value: `₹${totalEarnings.toLocaleString()}`,
      trend: '+12.5%',
      icon: DollarSign,
      color: 'text-brand-green',
      iconBg: 'bg-brand-green-light',
      label: 'Financial Performance'
    },
    {
      title: 'Active Auctions',
      value: userCrops.filter(c => c.status === 'active').length,
      trend: '+2 new',
      icon: TrendingUp,
      color: 'text-blue-500',
      iconBg: 'bg-blue-50',
      label: 'Market Presence'
    },
    {
      title: 'Logistics Queue',
      value: userLogistics.length,
      trend: '3 In-Transit',
      icon: Truck,
      color: 'text-purple-500',
      iconBg: 'bg-purple-50',
      label: 'Operation Sync'
    },
    {
      title: 'Feed Engagement',
      value: userPosts.length,
      trend: '+45 reads',
      icon: MessageCircle,
      color: 'text-orange-500',
      iconBg: 'bg-orange-50',
      label: 'Network Strength'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-brand-surface font-poppins text-gray-900 pb-20">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pt-12">

        {/* ── Top Navigation Bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-green bg-brand-green-light px-3 py-1 rounded-full">System Active</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none flex items-center gap-2">
                <Calendar size={12} className="text-gray-300" /> February 2026
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-950">Wellness <span className="text-brand-green">Insights</span></h1>
            <p className="text-sm text-gray-400 font-medium mt-1">Track your agricultural journey and discover productivity patterns.</p>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2.5 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 hover:bg-gray-50 transition-all shadow-sm">
              <Download size={16} className="text-gray-400" />
              Export Analytics
            </button>
          </div>
        </div>

        {/* ── Visual Stats Summary ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
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
              {/* Subtle BG Decoration */}
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${stat.iconBg} opacity-10 group-hover:scale-150 transition-transform`} />
            </div>
          ))}
        </div>

        {/* ── Main Analytics Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Weekly Activity Area Chart (Simulated with CSS) */}
          <div className="lg:col-span-7 bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Yield Velocity</h2>
                <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">Operational volume over the past 7 days</p>
              </div>
              <div className="flex items-center gap-2 text-brand-green bg-brand-green-light px-3 py-1.5 rounded-xl">
                <Activity size={14} />
                <span className="text-[10px] font-black uppercase">+15% Peak</span>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-4 h-64 px-4 pb-4 border-b border-gray-50 mb-6">
              {/* Visual Bars */}
              {[
                { day: 'Mon', h: '40%' },
                { day: 'Tue', h: '65%' },
                { day: 'Wed', h: '80%' },
                { day: 'Thu', h: '70%' },
                { day: 'Fri', h: '60%' },
                { day: 'Sat', h: '50%' },
                { day: 'Sun', h: '45%' },
              ].map((bar) => (
                <div key={bar.day} className="flex-1 flex flex-col items-center group">
                  <div
                    className="w-full bg-gradient-to-t from-brand-green/20 to-brand-green/80 rounded-[20px] transition-all duration-1000 group-hover:to-brand-green group-hover:shadow-lg shadow-brand-green/20"
                    style={{ height: bar.h }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest mt-4 text-gray-400 group-hover:text-gray-900 transition-colors">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution Analysis */}
          <div className="lg:col-span-5 bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm">
            <div className="mb-10">
              <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Market Distribution</h2>
              <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">Your most common crop listings</p>
            </div>

            <div className="space-y-8">
              {[
                { name: 'Organic Wheat', value: '45%', count: '3 sessions', color: 'bg-brand-green' },
                { name: 'Premium Rice', value: '30%', count: '2 sessions', color: 'bg-blue-500' },
                { name: 'Red Chilies', value: '15%', count: '1 sessions', color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.name} className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold px-1">
                    <span className="text-gray-900 uppercase tracking-widest">{item.name}</span>
                    <span className="text-gray-400">{item.count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.value }} />
                  </div>
                </div>
              ))}
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
                <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">Common thought patterns from your sessions</p>
              </div>

              <div className="space-y-4">
                {[
                  { id: 1, title: 'Harvest Optimization', count: 'High Yield', color: 'bg-yellow-400' },
                  { id: 2, title: 'Logistics Efficiency', count: 'Matched', color: 'bg-blue-400' },
                  { id: 3, title: 'Price Resilience', count: 'Active', color: 'bg-red-400' },
                ].map(pattern => (
                  <div key={pattern.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-white border border-transparent hover:border-gray-100 transition-all">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 ${pattern.color} text-[10px] font-black text-white flex items-center justify-center rounded-xl shadow-lg shadow-gray-200`}>
                        {pattern.id}
                      </span>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{pattern.title}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-400">{pattern.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Session Times */}
            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Peak Productivity Window</h3>
              <div className="flex items-center justify-between p-4 bg-brand-surface rounded-[24px]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-green rounded-2xl text-white shadow-lg shadow-brand-green/20">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase text-gray-950">Morning Cycle</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">8:00 AM — 11:00 AM</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-brand-green uppercase tracking-widest">High Focus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics Visualization */}
          <div className="lg:col-span-7 relative h-full">
            <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Your Progress</h2>
                  <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">February 2026 Snapshot</p>
                </div>
                <LayoutGrid className="text-gray-200" />
              </div>

              <div className="relative flex-1 rounded-[32px] overflow-hidden group min-h-[300px]">
                {/* Integrated Map View as a background for this section */}
                <div className="absolute inset-0 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none">
                  <Suspense fallback={<div className="h-full w-full bg-gray-50 flex items-center justify-center"><Activity className="animate-pulse" /></div>}>
                    <AgriMap />
                  </Suspense>
                </div>

                {/* Vibrant Gradient Card with Stats */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#8e44ad] via-[#9b59b6] to-[#e67e22] rounded-[32px] p-10 flex flex-col justify-end shadow-2xl relative overflow-hidden group">
                  {/* Subtle Map Overlay */}
                  <div className="absolute inset-0 opacity-10 grayscale invert pointer-events-none">
                    <Suspense fallback={null}>
                      <AgriMap />
                    </Suspense>
                  </div>

                  <div className="relative z-10 flex items-end justify-between gap-12 text-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-6">
                        <Star size={16} fill="currentColor" className="text-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Operational Grade A+</span>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Total Deliveries</p>
                          <p className="text-4xl font-black tracking-tight text-white">{userLogistics.length}</p>
                          <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-widest">Matched Today</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Total Flight Time</p>
                          <p className="text-4xl font-black tracking-tight text-white">120 <span className="text-sm font-bold text-white/50 uppercase tracking-widest">HRS</span></p>
                          <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-widest">Transporter Active</p>
                        </div>
                      </div>
                    </div>
                    <button className="p-5 bg-white text-gray-950 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all">
                      <ChevronRight size={28} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                <p className="text-xs font-bold text-gray-900 italic">"Great progress, {user.name}! Keep up the consistent sessions."</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions / Floating Command ── */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-full px-8 py-4 flex items-center gap-8 shadow-2xl">
            <div className="flex items-center gap-6">
              <button className="flex flex-col items-center gap-1 group">
                <Package size={18} className="text-gray-400 group-hover:text-brand-green transition-colors" />
                <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">List Crop</span>
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button className="flex flex-col items-center gap-1 group">
                <ShoppingCart size={18} className="text-gray-400 group-hover:text-brand-green transition-colors" />
                <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">Buy Inputs</span>
              </button>
              <div className="w-px h-6 bg-white/10" />
              <button className="flex flex-col items-center gap-1 group">
                <Truck size={18} className="text-gray-400 group-hover:text-brand-green transition-colors" />
                <span className="text-[8px] font-black uppercase text-gray-500 group-hover:text-white transition-colors">Logistics</span>
              </button>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <button className="flex flex-col items-center gap-1 group">
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
      `}</style>
    </div>
  );
};

export default Dashboard;
