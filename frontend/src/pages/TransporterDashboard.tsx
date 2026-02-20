import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Truck, CheckCircle, Play, Package, MapPin, Clock } from 'lucide-react';
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
    const [loading, setLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState<LogisticsRequest | null>(null);

    // Auto-refresh for live tracking
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

    // Auto-refresh for live tracking
    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 3000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

    // Sync selectedJob with requests updates
    useEffect(() => {
        // Auto-select the first active job for the map
        const activeJobs = requests.filter(r =>
            ['accepted', 'in-transit'].includes(r.status)
        );
        if (activeJobs.length > 0 && !selectedJob) {
            setSelectedJob(activeJobs[0]);
        } else if (selectedJob) {
            // Sync selectedJob with latest data from requests
            const updated = requests.find(r => r.id === selectedJob.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedJob)) {
                setSelectedJob(updated);
            }
        }
    }, [requests, selectedJob]);

    const handleAction = async (id: string, action: 'accept' | 'start' | 'complete') => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    const handleProgressUpdate = async (id: string, progress: number) => {
        // Debounce or direct update? Direct update on mouseUp/touchEnd is fine.
        try {
            await fetch(`http://localhost:3000/logistics/${id}/progress`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user?.id}`
                },
                body: JSON.stringify({ progress })
            });
            // Update local state is already done optimistically, but let's sync to be sure
            fetchRequests();
        } catch (error) {
            console.error("Failed to update progress", error);
        }
    };

    // Filter Logic
    const availableJobs = requests.filter(r => r.status === 'pending');
    const myJobs = requests.filter(r =>
        (r.transporterId === user?.id || !r.transporterId) &&
        ['accepted', 'in-transit'].includes(r.status)
    );

    // Stats
    const activeCount = myJobs.length;
    const availableCount = availableJobs.length;
    const completedCount = requests.filter(r => r.status === 'completed').length;

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Truck size={32} className="text-blue-600" />
                    Transporter Control Room
                </h1>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs text-blue-500 uppercase tracking-wide font-medium flex items-center gap-1">
                        <Truck size={14} /> Active Jobs
                    </p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{activeCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs text-orange-500 uppercase tracking-wide font-medium flex items-center gap-1">
                        <Clock size={14} /> Available
                    </p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{availableCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs text-green-500 uppercase tracking-wide font-medium flex items-center gap-1">
                        <CheckCircle size={14} /> Completed
                    </p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{completedCount}</p>
                </div>
            </div>

            {/* Route Map for selected active job */}
            {selectedJob && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                        🗺️ Tracking Map: <span className="text-blue-600">{selectedJob.cropType} ({selectedJob.fromLocation} → {selectedJob.toLocation})</span>
                    </h3>
                    <Suspense fallback={<div className="h-[350px] flex items-center justify-center text-gray-400">Loading map...</div>}>
                        <DeliveryRouteMap
                            key={selectedJob.id}
                            fromLocation={selectedJob.fromLocation}
                            toLocation={selectedJob.toLocation}
                            height="350px"
                            progress={selectedJob.status === 'in-transit' ? (selectedJob.progress ?? 0) : undefined}
                        />
                    </Suspense>
                </div>
            )}

            {/* ACTIVE JOBS SECTION */}
            <section className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">My Active Jobs</h2>

                <div className="grid gap-4">
                    {myJobs.length === 0 ? (
                        <p className="text-gray-500 italic">No active jobs. Accept one below!</p>
                    ) : (
                        myJobs.map(job => (
                            <div
                                key={job.id}
                                onClick={() => setSelectedJob(job)}
                                className={`bg-white p-5 rounded-xl shadow-sm border-l-4 cursor-pointer transition-all hover:shadow-md ${selectedJob?.id === job.id ? 'border-l-blue-600 ring-1 ring-blue-200' : 'border-l-blue-400'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg">{job.cropType} — {job.quantity}kg</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                            <MapPin size={14} /> {job.fromLocation} → {job.toLocation}
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {job.status.replace('-', ' ')}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setSelectedJob(job)}
                                    className="w-full mt-2 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded flex items-center justify-center gap-1 transition"
                                >
                                    <MapPin size={12} /> View on Map {selectedJob?.id === job.id && '👁️'}
                                </button>

                                {/* Progress Control for In-Transit */}
                                {job.status === 'in-transit' && (
                                    <div className="mb-3 mt-4">
                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                            <span>Progress</span>
                                            <span className="font-bold text-blue-600">{job.progress || 0}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            value={job.progress || 0}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                // Optimistic update locally
                                                setRequests(prev => prev.map(r => r.id === job.id ? { ...r, progress: val } : r));
                                            }}
                                            onMouseUp={(e) => {
                                                // Commit to backend on release
                                                handleProgressUpdate(job.id, parseInt((e.target as HTMLInputElement).value));
                                            }}
                                            onTouchEnd={(e) => {
                                                handleProgressUpdate(job.id, parseInt((e.target as HTMLInputElement).value));
                                            }}
                                        />
                                    </div>
                                )}

                                {/* CONTROLS */}
                                <div className="flex gap-3 justify-end">
                                    {job.status === 'accepted' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(job.id, 'start'); }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm"
                                        >
                                            <Play size={16} /> Start Journey
                                        </button>
                                    )}
                                    {job.status === 'in-transit' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(job.id, 'complete'); }}
                                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm"
                                        >
                                            <CheckCircle size={16} /> Complete Delivery
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* AVAILABLE JOBS SECTION */}
            <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Available Shipments</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {availableJobs.map(job => (
                        <div key={job.id} className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition">
                            <div className="flex items-center justify-between mb-3">
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">New</span>
                                <span className="text-sm text-gray-500">{job.requestedDate}</span>
                            </div>

                            <h3 className="font-bold text-lg mb-1">{job.quantity}kg {job.cropType}</h3>

                            <div className="space-y-2 mt-4 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="font-medium">From:</span> {job.fromLocation}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="font-medium">To:</span> {job.toLocation}
                                </div>
                            </div>

                            <button
                                onClick={() => handleAction(job.id, 'accept')}
                                disabled={loading}
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 rounded-lg font-medium transition"
                            >
                                Accept Job
                            </button>
                        </div>
                    ))}

                    {availableJobs.length === 0 && (
                        <div className="col-span-full text-center py-10 bg-gray-50 rounded-xl">
                            <Package className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-gray-500">No new jobs available right now.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default TransporterDashboard;
