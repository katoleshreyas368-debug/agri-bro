import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { MapPin, Calendar, Truck, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InlineLocationPicker from '../components/InlineLocationPicker';
import LocationPreviewMap from '../components/LocationPreviewMap';

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
}

const FarmerLogistics: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<LogisticsRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LogisticsRequest | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Location picker state
    // Location picker state
    const [activePicker, setActivePicker] = useState<'none' | 'fromLocation' | 'toLocation'>('none');

    // Form State
    const [formData, setFormData] = useState<Omit<LogisticsRequest, 'id' | 'status' | 'progress'>>({
        cropType: '',
        quantity: 0,
        fromLocation: '',
        toLocation: '',
        requestedDate: ''
    });

    const [coords, setCoords] = useState<{ from: [number, number] | null; to: [number, number] | null }>({
        from: null,
        to: null
    });


    useEffect(() => {
        if (requests.length > 0 && !selectedRequest) {
            const active = requests.find(r => r.status === 'in-transit') ||
                requests.find(r => r.status === 'accepted') ||
                requests[0];
            setSelectedRequest(active ?? null);
        } else if (selectedRequest) {
            // Sync selectedRequest with latest data from requests
            const updated = requests.find(r => r.id === selectedRequest.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedRequest)) {
                setSelectedRequest(updated);
            }
        }
    }, [requests, selectedRequest]);

    const fetchRequests = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch('http://localhost:3000/logistics', {
                headers: { Authorization: `Bearer ${user?.id}` },
                cache: 'no-store'
            });
            if (res.ok) setRequests(await res.json());
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    }, [user]);

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 2000); // Auto-refresh every 2s for live tracking
        return () => clearInterval(interval);
    }, [fetchRequests]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/logistics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.id}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const newReq = await res.json();
                setRequests([newReq, ...requests]);
                setSelectedRequest(newReq); // Auto-select the new request
                setFormData({ cropType: '', quantity: 0, fromLocation: '', toLocation: '', requestedDate: '' });
                setShowForm(false);
            }
        } catch (error) {
            console.error("Error creating request", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePickerConfirm = (locationName: string, lat: number, lng: number) => {
        if (activePicker === 'none') return;
        setFormData(prev => ({ ...prev, [activePicker]: locationName }));
        if (lat && lng) {
            setCoords(prev => ({
                ...prev,
                [activePicker === 'fromLocation' ? 'from' : 'to']: [lat, lng]
            }));
        }
        setActivePicker('none');
    };

    // Stats
    const totalRequests = requests.length;
    const inTransit = requests.filter(r => r.status === 'in-transit').length;
    const completed = requests.filter(r => r.status === 'completed').length;

    // Filtered requests
    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.toLocation.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-7xl mx-auto p-6">


            {/* Header */}
            <header className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Logistics Hub</h1>
                <button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2">
                    + New Request
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Requests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{totalRequests}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs text-blue-500 uppercase tracking-wide font-medium flex items-center gap-1">
                        <Truck size={14} /> In Transit
                    </p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{inTransit}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs text-green-500 uppercase tracking-wide font-medium flex items-center gap-1">
                        <CheckCircle size={14} /> Completed
                    </p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{completed}</p>
                </div>
            </div>

            {/* New Request Form (collapsible) */}
            {showForm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative p-6 animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            New Transport Request
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Crop Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                                    placeholder="e.g. Wheat, Rice, Sugarcane"
                                    value={formData.cropType}
                                    onChange={e => setFormData({ ...formData, cropType: e.target.value })}
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                                    placeholder="e.g. 500"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                />
                            </div>

                            {/* Pickup Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition mb-2"
                                    placeholder="e.g. Pune"
                                    value={formData.fromLocation}
                                    onChange={e => setFormData({ ...formData, fromLocation: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setActivePicker(activePicker === 'fromLocation' ? 'none' : 'fromLocation')}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition font-medium text-sm"
                                >
                                    <span className="flex"><MapPin size={16} fill="currentColor" className="mr-[-6px]" /><MapPin size={16} fill="currentColor" /></span>
                                    {activePicker === 'fromLocation' ? 'Close Map' : 'Pick Pickup on Map'}
                                </button>

                                {activePicker === 'fromLocation' && (
                                    <InlineLocationPicker
                                        onConfirm={handlePickerConfirm}
                                        onCancel={() => setActivePicker('none')}
                                        initialLat={coords.from?.[0]}
                                        initialLng={coords.from?.[1]}
                                    />
                                )}

                                {coords.from && activePicker !== 'fromLocation' && <LocationPreviewMap lat={coords.from[0]} lng={coords.from[1]} />}
                            </div>

                            {/* Delivery Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition mb-2"
                                    placeholder="e.g. Mumbai"
                                    value={formData.toLocation}
                                    onChange={e => setFormData({ ...formData, toLocation: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setActivePicker(activePicker === 'toLocation' ? 'none' : 'toLocation')}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition font-medium text-sm"
                                >
                                    <span className="flex"><MapPin size={16} fill="currentColor" className="mr-[-6px]" /><MapPin size={16} fill="currentColor" /></span>
                                    {activePicker === 'toLocation' ? 'Close Map' : 'Pick Delivery on Map'}
                                </button>

                                {activePicker === 'toLocation' && (
                                    <InlineLocationPicker
                                        onConfirm={handlePickerConfirm}
                                        onCancel={() => setActivePicker('none')}
                                        initialLat={coords.to?.[0]}
                                        initialLng={coords.to?.[1]}
                                    />
                                )}

                                {coords.to && activePicker !== 'toLocation' && <LocationPreviewMap lat={coords.to[0]} lng={coords.to[1]} />}
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition pr-10"
                                        value={formData.requestedDate}
                                        onChange={e => setFormData({ ...formData, requestedDate: e.target.value })}
                                    />
                                    <Calendar className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? 'Submitting Request...' : 'Submit Request'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delivery Map with truck tracking */}
            {selectedRequest && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                    <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        📍 Delivery Map
                        <span className="text-gray-400 font-normal text-sm">
                            — Showing route for {selectedRequest.cropType} ({selectedRequest.fromLocation} → {selectedRequest.toLocation})
                        </span>
                    </h3>
                    <Suspense fallback={<div className="h-[350px] flex items-center justify-center text-gray-400">Loading map...</div>}>
                        <DeliveryRouteMap
                            key={selectedRequest.id}
                            fromLocation={selectedRequest.fromLocation}
                            toLocation={selectedRequest.toLocation}
                            height="350px"
                            progress={selectedRequest.status === 'in-transit' ? (selectedRequest.progress ?? 0) : undefined}
                        />
                    </Suspense>
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input type="text" className="flex-1 px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Search crops or locations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <select className="px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="in-transit">In Transit</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {/* Requests List */}
            <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <Truck size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No transport requests found</p>
                    </div>
                ) : (
                    filteredRequests.map(req => (
                        <div
                            key={req.id}
                            onClick={() => setSelectedRequest(req)}
                            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${selectedRequest?.id === req.id ? 'border-green-500 ring-1 ring-green-200' : 'border-gray-100'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900">{req.cropType}</h3>
                                    <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                        <MapPin size={12} /> {req.fromLocation} → {req.toLocation}
                                    </p>
                                    <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                                        <Calendar size={12} /> {req.requestedDate} &bull; {req.quantity} kg
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {req.status === 'in-transit' && req.progress !== undefined && (
                                        <div className="w-32">
                                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${req.progress}%` }} />
                                            </div>
                                            <p className="text-[10px] text-right mt-0.5 text-blue-600 font-medium">{req.progress}%</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    req.status === 'in-transit' ? 'bg-blue-100 text-blue-700' :
                                        req.status === 'accepted' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {req.status}
                                </span>
                                {req.status === 'in-transit' && (
                                    <span className="text-xs font-bold text-blue-600 ml-auto">
                                        {req.progress}%
                                    </span>
                                )}
                                <button className="ml-auto text-xs font-medium text-green-600 hover:text-green-800 flex items-center gap-1">
                                    View on Map {selectedRequest?.id === req.id && '👁️'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FarmerLogistics;
