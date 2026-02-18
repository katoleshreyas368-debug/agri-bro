import React, { useState, useEffect } from 'react';
import { Package, MapPin, Calendar, ArrowRight, Truck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LogisticsRequest {
    id: string;
    cropType: string;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    requestedDate: string;
    status: 'pending' | 'accepted' | 'in-transit' | 'completed';
    progress?: number;
}

const FarmerLogistics: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<LogisticsRequest[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        cropType: '',
        quantity: '',
        fromLocation: '',
        toLocation: '',
        requestedDate: ''
    });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('http://localhost:3000/logistics', {
                headers: {
                    Authorization: `Bearer ${user?.id}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter only my requests if real auth
                setRequests(data);
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('http://localhost:3000/logistics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user?.id}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const newReq = await res.json();
                setRequests([newReq, ...requests]);
                setFormData({
                    cropType: '',
                    quantity: '',
                    fromLocation: '',
                    toLocation: '',
                    requestedDate: ''
                });
                alert('Request Created Successfully!');
            }
        } catch (error) {
            console.error("Error creating request", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Farmer Logistics Hub</h1>
                <p className="text-gray-600 mt-2">Request transport for your harvest easily</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Create Request Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Package className="text-green-600" />
                            New Shipment
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="e.g. Wheat, Rice"
                                    value={formData.cropType}
                                    onChange={e => setFormData({ ...formData, cropType: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="1000"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="Farm"
                                            value={formData.fromLocation}
                                            onChange={e => setFormData({ ...formData, fromLocation: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="Market"
                                            value={formData.toLocation}
                                            onChange={e => setFormData({ ...formData, toLocation: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        value={formData.requestedDate}
                                        onChange={e => setFormData({ ...formData, requestedDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-2"
                            >
                                {loading ? 'Posting...' : (
                                    <>
                                        Find Transporter <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right: My Requests List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold mb-4">My Requests</h2>

                    {requests.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Truck size={48} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No transport requests yet</p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{req.cropType}</h3>
                                        <p className="text-gray-500 text-sm">{req.quantity} kg • {req.requestedDate}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                                    ${req.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            req.status === 'in-transit' ? 'bg-blue-100 text-blue-700' :
                                                req.status === 'accepted' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                        }
                                `}>
                                        {req.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                    <span className="font-medium text-gray-900">{req.fromLocation}</span>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className="font-medium text-gray-900">{req.toLocation}</span>
                                </div>

                                {/* Show Progress only if In-Transit */}
                                {req.status === 'in-transit' && (
                                    <div className="mt-4">
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${req.progress || 0}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-right mt-1 text-blue-600 font-medium">{req.progress}% Complete</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

export default FarmerLogistics;
