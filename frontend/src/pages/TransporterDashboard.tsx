import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, Play, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LiveMapTracker from '../components/LiveMapTracker';

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

    // Auto-refresh for live tracking
    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('http://localhost:3000/logistics', {
                headers: { Authorization: `Bearer ${user?.id}` }
            });
            const data = await res.json();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    const handleAction = async (id: string, action: 'accept' | 'start' | 'complete') => {
        setLoading(true);
        try {
            await fetch(`http://localhost:3000/logistics/${id}/${action}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user?.id}`
                }
            });
            fetchRequests();
        } catch (error) {
            console.error(`Failed to ${action} request`, error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const availableJobs = requests.filter(r => r.status === 'pending');
    const myJobs = requests.filter(r =>
        (r.transporterId === user?.id || !r.transporterId) && // Show all for demo if no specific ID logic
        ['accepted', 'in-transit'].includes(r.status)
    );

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Truck size={32} className="text-blue-600" />
                    Transporter Control Room
                </h1>
            </header>

            {/* ACTIVE JOBS SECTION */}
            <section className="mb-12">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">My Active Jobs</h2>

                <div className="grid gap-6">
                    {myJobs.length === 0 ? (
                        <p className="text-gray-500 italic">No active jobs. Accept one below!</p>
                    ) : (
                        myJobs.map(job => (
                            <div key={job.id} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{job.cropType} - {job.quantity}kg</h3>
                                        <p className="text-sm text-gray-500">From: {job.farmerName || 'Farmer'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wide">
                                            {job.status}
                                        </span>
                                    </div>
                                </div>

                                {/* LIVE TRACKER */}
                                <LiveMapTracker
                                    status={job.status}
                                    progress={job.progress || 0}
                                    from={job.fromLocation}
                                    to={job.toLocation}
                                />

                                {/* CONTROLS */}
                                <div className="mt-6 flex gap-3 justify-end">
                                    {job.status === 'accepted' && (
                                        <button
                                            onClick={() => handleAction(job.id, 'start')}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                                        >
                                            <Play size={18} /> Start Journey
                                        </button>
                                    )}

                                    {job.status === 'in-transit' && (
                                        <button
                                            onClick={() => handleAction(job.id, 'complete')}
                                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Complete Delivery
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
