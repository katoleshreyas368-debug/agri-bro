import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Truck, MapPin, Activity, Navigation, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DeliveryRouteMap = React.lazy(() => import('../components/DeliveryRouteMap'));

interface LogisticsRequest {
    id: string;
    cropType: string;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    requestedDate: string;
    status: 'pending' | 'accepted' | 'in-transit' | 'completed';
    progress?: number;
    transporterId?: string;
    farmerName?: string;
}

const TransporterDashboard: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<LogisticsRequest[]>([]);
    const [selectedJob, setSelectedJob] = useState<LogisticsRequest | null>(null);
    const [activeTab, setActiveTab] = useState<'mine' | 'available'>('mine');

    const fetchRequests = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch('http://localhost:3000/logistics', {
                headers: { Authorization: `Bearer ${user?.id}` },
                cache: 'no-store'
            });
            const data = await res.json();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    }, [user]);

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 3000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

    useEffect(() => {
        const activeJobs = requests.filter(r => ['accepted', 'in-transit'].includes(r.status));
        if (activeJobs.length > 0 && !selectedJob) {
            setSelectedJob(activeJobs[0]);
        } else if (selectedJob) {
            const updated = requests.find(r => r.id === selectedJob.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedJob)) {
                setSelectedJob(updated);
            }
        }
    }, [requests, selectedJob]);

    const handleAction = async (id: string, action: 'accept' | 'start' | 'complete') => {
        try {
            const res = await fetch(`http://localhost:3000/logistics/${id}/${action}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user?.id}`
                }
            });
            if (res.ok) {
                const updatedJob = await res.json();
                await fetchRequests();
                setSelectedJob(updatedJob);
            }
        } catch (error) {
            console.error(`Failed to ${action} request`, error);
        } finally {
            // No-op
        }
    };

    const handleProgressUpdate = async (id: string, progress: number) => {
        try {
            await fetch(`http://localhost:3000/logistics/${id}/progress`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user?.id}`
                },
                body: JSON.stringify({ progress })
            });
            fetchRequests();
        } catch (error) {
            console.error("Failed to update progress", error);
        }
    };

    const availableJobs = requests.filter(r => r.status === 'pending');
    const myJobs = requests.filter(r => (r.transporterId === user?.id || !r.transporterId) && ['accepted', 'in-transit'].includes(r.status));

    const totalInTransit = requests.filter(r => r.status === 'in-transit').length;

    return (
        <div className="h-[calc(100vh-64px)] bg-brand-surface text-gray-900 flex overflow-hidden">
            {/* ── Side Console: Jobs & Log ── */}
            <aside className="w-96 bg-white border-r border-gray-200 flex flex-col z-50 shadow-xl">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em]">Control Unit</p>
                            <h1 className="text-xl font-black mt-1 text-gray-900">Transporter Hub</h1>
                        </div>
                        <Settings className="text-gray-300 hover:text-brand-green transition-colors cursor-pointer" size={20} />
                    </div>

                    <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-200 text-[10px] font-bold uppercase tracking-widest">
                        <button
                            onClick={() => setActiveTab('mine')}
                            className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'mine' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Active ({myJobs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('available')}
                            className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'available' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Market ({availableJobs.length})
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 CustomScrollbar">
                    {activeTab === 'mine' ? (
                        <>
                            {myJobs.length === 0 ? (
                                <div className="text-center py-20 opacity-20 flex flex-col items-center text-gray-400">
                                    <Truck size={40} className="mb-4" />
                                    <p className="text-xs uppercase font-bold tracking-[0.2em]">Ready for Dispatch</p>
                                </div>
                            ) : (
                                myJobs.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => setSelectedJob(job)}
                                        className={`group relative p-5 rounded-2xl border transition-all cursor-pointer ${selectedJob?.id === job.id
                                            ? 'bg-brand-green/5 border-brand-green/30 shadow-sm'
                                            : 'bg-white border-gray-100 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl ${job.status === 'in-transit' ? 'bg-blue-50 text-blue-500' : 'bg-yellow-50 text-yellow-600'}`}>
                                                    <Navigation size={20} className={job.status === 'in-transit' ? 'animate-pulse' : ''} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">{job.cropType}</h3>
                                                    <p className="text-[10px] text-gray-400 mt-1 font-bold">{job.quantity} KG Dispatch</p>
                                                </div>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${job.status === 'in-transit' ? 'bg-blue-50 text-blue-500' : 'bg-yellow-50 text-yellow-600'
                                                }`}>
                                                {job.status}
                                            </span>
                                        </div>

                                        <div className="py-3 border-y border-gray-50 my-3 relative overflow-hidden">
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                                                <MapPin size={10} className="text-brand-green" /> <span className="truncate">{job.fromLocation}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                <Navigation size={10} className="text-red-500" /> <span className="truncate">{job.toLocation}</span>
                                            </div>
                                        </div>

                                        {job.status === 'in-transit' && (
                                            <div className="mt-4">
                                                <input
                                                    type="range"
                                                    min="0" max="100"
                                                    value={job.progress || 0}
                                                    onChange={(e) => handleProgressUpdate(job.id, parseInt(e.target.value))}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-brand-green"
                                                />
                                                <div className="flex justify-between mt-2">
                                                    <span className="text-[9px] font-black text-brand-green uppercase tracking-widest">Live Sync</span>
                                                    <span className="text-[9px] font-bold text-gray-400">{job.progress || 0}%</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4 flex gap-2">
                                            {job.status === 'accepted' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAction(job.id, 'start'); }}
                                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                                                >
                                                    Start Route
                                                </button>
                                            )}
                                            {job.status === 'in-transit' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAction(job.id, 'complete'); }}
                                                    className="flex-1 py-2.5 bg-brand-green hover:bg-brand-green-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-green/20"
                                                >
                                                    Finalize Delivery
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            {availableJobs.map(job => (
                                <div key={job.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-brand-green/30 transition-all shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="bg-brand-green/10 text-brand-green px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">New Opportunity</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{job.requestedDate}</span>
                                    </div>
                                    <h3 className="text-base font-black uppercase tracking-tight mb-4 text-gray-900">{job.quantity}KG {job.cropType}</h3>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                            <p className="text-[11px] text-gray-500 font-medium truncate">{job.fromLocation}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            <p className="text-[11px] text-gray-500 font-medium truncate">{job.toLocation}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAction(job.id, 'accept')}
                                        className="w-full py-3 bg-brand-green hover:bg-brand-green-dark text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-brand-green/20"
                                    >
                                        Lock Contract
                                    </button>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Fleet Efficiency</span>
                        <span className="text-[10px] font-bold text-brand-green">OPTIMAL</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-green w-4/5"></div>
                    </div>
                </div>
            </aside>

            {/* ── Center: Integrated Tactical Map ── */}
            <main className="flex-1 relative bg-white z-0">
                <div className="h-full w-full">
                    {selectedJob ? (
                        <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-brand-surface"><Activity className="animate-pulse text-brand-green" /></div>}>
                            <DeliveryRouteMap
                                key={selectedJob.id}
                                fromLocation={selectedJob.fromLocation}
                                toLocation={selectedJob.toLocation}
                                height="calc(100vh - 64px)"
                                progress={selectedJob.status === 'in-transit' ? (selectedJob.progress ?? 0) : undefined}
                                theme="streets"
                            />
                        </Suspense>
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-brand-surface">
                            <Truck size={60} className="text-gray-200 mb-4" />
                            <p className="text-sm uppercase font-bold tracking-widest text-gray-300">Awaiting Signal...</p>
                        </div>
                    )}
                </div>

                {/* Overlays */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-50">
                    <div className="flex gap-4 pointer-events-auto">
                        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 p-4 rounded-2xl flex items-center gap-6 shadow-2xl">
                            <div>
                                <p className="text-[10px] font-bold text-brand-green uppercase mb-1">Active Assets</p>
                                <p className="text-lg font-black text-gray-900">{totalInTransit}</p>
                            </div>
                            <div className="w-px h-8 bg-gray-100"></div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Signal Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-bold uppercase text-gray-700">UHF LINK ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-xl border border-gray-200 p-4 rounded-2xl flex items-center gap-4 pointer-events-auto shadow-2xl">
                        <ShieldCheck className="text-brand-green" size={24} />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Authentication</p>
                            <p className="text-xs font-black text-gray-900">SECURE SESSION</p>
                        </div>
                    </div>
                </div>

                {selectedJob && (
                    <div className="absolute bottom-6 left-6 right-6 pointer-events-none z-50 flex justify-center">
                        <div className="bg-white/95 backdrop-blur-2xl border border-gray-200 p-6 rounded-[32px] shadow-2xl max-w-4xl w-full flex flex-col md:flex-row items-center justify-between pointer-events-auto border-t-2 border-t-brand-green/30">
                            <div className="flex items-center gap-6 mb-4 md:mb-0">
                                <div className="w-16 h-16 bg-gray-50 rounded-[20px] flex items-center justify-center text-3xl shadow-inner border border-gray-100">
                                    🚚
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">{selectedJob.cropType}</h2>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${selectedJob.status === 'in-transit' ? 'bg-blue-50 text-blue-500' : 'bg-yellow-50 text-yellow-600'
                                            }`}>
                                            {selectedJob.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 font-bold">
                                        FARMER: <span className="text-brand-green">{selectedJob.farmerName || 'Registered Producer'}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-10">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Net Weight</p>
                                    <p className="text-xl font-black text-gray-900">{selectedJob.quantity} <span className="text-xs text-gray-400">KG</span></p>
                                </div>
                                <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">ETA Status</p>
                                    <p className="text-xl font-black text-brand-green uppercase">On Time</p>
                                </div>
                                <div className="w-px h-10 bg-gray-100 hidden md:block"></div>

                                <div className="flex gap-2">
                                    {selectedJob.status === 'accepted' && (
                                        <button
                                            onClick={() => handleAction(selectedJob.id, 'start')}
                                            className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[11px] px-8 py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
                                        >
                                            Engage Engine
                                        </button>
                                    )}
                                    {selectedJob.status === 'in-transit' && (
                                        <button
                                            onClick={() => handleAction(selectedJob.id, 'complete')}
                                            className="bg-brand-green hover:bg-brand-green-dark text-white font-black uppercase tracking-widest text-[11px] px-8 py-4 rounded-2xl shadow-xl shadow-brand-green/30 transition-all hover:scale-105 active:scale-95"
                                        >
                                            Confirm Arrival
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

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
                .CustomScrollbar::-webkit-scrollbar-thumb:hover {
                  background: #2e7d32;
                }
            `}</style>
        </div>
    );
};

export default TransporterDashboard;
