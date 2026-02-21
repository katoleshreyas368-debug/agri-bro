import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { MapPin, Calendar, CheckCircle, X, Search, Plus, Activity, Wind, Navigation, Package, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InlineLocationPicker from '../components/InlineLocationPicker';
import LocationPreviewMap from '../components/LocationPreviewMap';

const DeliveryRouteMap = React.lazy(() => import('../components/DeliveryRouteMap'));

interface LogisticsRequest {
    id: string;
    cropType: string; // Used for "Product/Order Name"
    quantity: number;
    fromLocation: string;
    toLocation: string;
    requestedDate: string;
    status: 'pending' | 'accepted' | 'in-transit' | 'completed';
    progress?: number;
}

const RetailerLogistics: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<LogisticsRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LogisticsRequest | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [activePicker, setActivePicker] = useState<'none' | 'fromLocation' | 'toLocation'>('none');

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
        const interval = setInterval(fetchRequests, 2000);
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
                setSelectedRequest(newReq);
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

    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.toLocation.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="h-[calc(100vh-80px)] bg-brand-surface text-gray-900 flex overflow-hidden">
            {/* ── Left Sidebar ── */}
            <aside className="w-96 bg-white border-r border-gray-200 flex flex-col z-[1500] shadow-xl">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em]">Procurement Hub</p>
                            <h1 className="text-xl font-bold mt-1 text-gray-900">Retailer Dashboard</h1>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="p-2.5 bg-brand-green hover:bg-brand-green-dark text-white rounded-xl transition-all shadow-lg shadow-brand-green/20"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/50 transition-all placeholder:text-gray-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 CustomScrollbar">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Orders</h2>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-[10px] bg-transparent text-brand-green font-bold uppercase tracking-wider outline-none cursor-pointer"
                        >
                            <option value="all">Total ({requests.length})</option>
                            <option value="pending">Pending</option>
                            <option value="in-transit">In Transit</option>
                            <option value="completed">Delivered</option>
                        </select>
                    </div>

                    {filteredRequests.length === 0 ? (
                        <div className="text-center py-12 opacity-30 text-gray-400">
                            <ShoppingBag size={40} className="mx-auto mb-3" />
                            <p className="text-sm">No orders found</p>
                        </div>
                    ) : (
                        filteredRequests.map(req => (
                            <div
                                key={req.id}
                                onClick={() => setSelectedRequest(req)}
                                className={`group relative p-5 rounded-2xl border transition-all cursor-pointer ${selectedRequest?.id === req.id
                                    ? 'bg-brand-green/5 border-brand-green/30 shadow-sm'
                                    : 'bg-white border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${req.status === 'in-transit' ? 'bg-blue-50 text-blue-500' :
                                            req.status === 'completed' ? 'bg-brand-green/10 text-brand-green' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            <PackageIcon status={req.status} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-wide leading-none text-gray-900">{req.cropType}</h3>
                                            <p className="text-[10px] text-gray-400 mt-1.5">{req.quantity} KG • {req.requestedDate}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 italic">
                                        <User size={10} className="text-brand-green" /> {req.fromLocation}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 italic">
                                        <MapPin size={10} className="text-red-500" /> {req.toLocation}
                                    </div>
                                </div>

                                {req.status === 'in-transit' && (
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center text-[10px] mb-1.5">
                                            <span className="text-blue-500 font-bold uppercase tracking-widest">Arriving</span>
                                            <span className="text-gray-600">{req.progress}%</span>
                                        </div>
                                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-blue-300 transition-all duration-1000"
                                                style={{ width: `${req.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50 mt-auto border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-2xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Monthly Spent</p>
                            <p className="text-lg font-bold mt-0.5 text-brand-green">₹42,500</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Reliability</p>
                            <p className="text-lg font-bold mt-0.5 text-blue-500">97.2%</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Main Panel ── */}
            <main className="flex-1 relative bg-white z-0">
                <div className="h-full w-full">
                    {selectedRequest ? (
                        <Suspense fallback={
                            <div className="h-full w-full flex flex-col items-center justify-center bg-brand-surface">
                                <Activity className="text-brand-green animate-pulse mb-4" size={40} />
                                <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Tracking Delivery...</p>
                            </div>
                        }>
                            <DeliveryRouteMap
                                key={selectedRequest.id}
                                fromLocation={selectedRequest.fromLocation}
                                toLocation={selectedRequest.toLocation}
                                height="calc(100vh - 80px)"
                                progress={selectedRequest.status === 'in-transit' ? (selectedRequest.progress ?? 0) : undefined}
                                theme="streets"
                            />
                        </Suspense>
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-brand-surface">
                            <ShoppingBag size={64} className="text-gray-200 mb-6" />
                            <h3 className="text-xl font-bold text-gray-300">Track your incoming shipments</h3>
                        </div>
                    )}
                </div>

                {/* Overlay: Top Navigation Bar */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-[1100]">
                    <div className="flex gap-4 pointer-events-auto">
                        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl p-4 flex items-center gap-6 shadow-2xl">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Buyer Type</span>
                                <span className="text-sm font-bold text-gray-900">Certified Retailer</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl p-4 flex items-center gap-6 pointer-events-auto shadow-2xl z-[1100]">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Order Tracking</p>
                            <div className="flex items-center gap-2 justify-end mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                                <span className="text-xs font-bold text-brand-green uppercase tracking-tighter">Live Status</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overlay: Bottom Details Panel */}
                {selectedRequest && (
                    <div className="absolute bottom-6 left-6 right-6 pointer-events-none z-[1100]">
                        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-[32px] p-6 flex flex-col md:flex-row md:items-center justify-between pointer-events-auto shadow-2xl max-w-5xl mx-auto border-t-2 border-t-brand-green/30">
                            <div className="flex items-center gap-5 mb-4 md:mb-0">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-gray-100">
                                    <ShoppingBag className="text-brand-green" size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">{selectedRequest.cropType}</h2>
                                        <StatusBadge status={selectedRequest.status} large />
                                    </div>
                                    <p className="text-gray-500 text-sm mt-1 font-medium flex items-center gap-2">
                                        ORDER ID: <span className="text-gray-900 font-bold tracking-tighter">{selectedRequest.id.split('-')[0].toUpperCase()}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Weight</p>
                                    <p className="text-xl font-black text-gray-900">{selectedRequest.quantity} <span className="text-xs text-gray-400">KG</span></p>
                                </div>
                                <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pick Up From</p>
                                    <p className="text-xl font-black text-brand-green uppercase tracking-tighter">{selectedRequest.fromLocation}</p>
                                </div>
                                <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                                <div className="flex flex-col gap-2">
                                    <button className="bg-brand-green text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-brand-green/20">
                                        Track Live
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Modals ── */}
            {showForm && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-y-auto relative p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-8">
                            <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em]">Logistics Request</span>
                            <h2 className="text-3xl font-black text-gray-900 mt-1">Order Logistics</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Item Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all"
                                        placeholder="e.g. Organic Wheat"
                                        value={formData.cropType}
                                        onChange={e => setFormData({ ...formData, cropType: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quantity (KG)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all"
                                        placeholder="0"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <LocationGrid
                                    label="Pick-Up Point (Farmer/Warehouse)"
                                    value={formData.fromLocation}
                                    onChange={(v: string) => setFormData({ ...formData, fromLocation: v })}
                                    onPickerOpen={() => setActivePicker('fromLocation')}
                                    pickerActive={activePicker === 'fromLocation'}
                                    coords={coords.from}
                                />

                                <LocationGrid
                                    label="My Retail Location"
                                    value={formData.toLocation}
                                    onChange={(v: string) => setFormData({ ...formData, toLocation: v })}
                                    onPickerOpen={() => setActivePicker('toLocation')}
                                    pickerActive={activePicker === 'toLocation'}
                                    coords={coords.to}
                                />

                                {activePicker !== 'none' && (
                                    <div className="mt-2 rounded-2xl overflow-hidden border border-brand-green/20">
                                        <InlineLocationPicker
                                            onConfirm={handlePickerConfirm}
                                            onCancel={() => setActivePicker('none')}
                                            initialLat={activePicker === 'fromLocation' ? coords.from?.[0] : coords.to?.[0]}
                                            initialLng={activePicker === 'fromLocation' ? coords.from?.[1] : coords.to?.[1]}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Target Delivery Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all"
                                        value={formData.requestedDate}
                                        onChange={e => setFormData({ ...formData, requestedDate: e.target.value })}
                                    />
                                    <Calendar className="absolute right-4 top-3.5 text-gray-300 pointer-events-none" size={18} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50 mt-4 h-16 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <Activity className="animate-spin" size={20} />
                                ) : (
                                    <>Request Logistics <Navigation size={20} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

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

/* ── Sub-Components ── */

const PackageIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle size={18} />;
    if (status === 'in-transit') return <Wind size={18} className="animate-pulse" />;
    return <Package size={18} />;
};

const StatusBadge = ({ status, large = false }: { status: string, large?: boolean }) => {
    const colors = {
        'completed': 'bg-brand-green/10 text-brand-green',
        'in-transit': 'bg-blue-50 text-blue-500',
        'accepted': 'bg-yellow-50 text-yellow-600',
        'pending': 'bg-gray-100 text-gray-400'
    };

    return (
        <span className={`rounded-lg uppercase font-black tracking-widest ${large ? 'px-3 py-1 text-[10px]' : 'px-2 py-0.5 text-[8px]'} ${colors[status as keyof typeof colors]}`}>
            {status}
        </span>
    );
};

interface LocationGridProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onPickerOpen: () => void;
    pickerActive: boolean;
    coords: [number, number] | null;
}

const LocationGrid = ({ label, value, onChange, onPickerOpen, pickerActive, coords }: LocationGridProps) => (
    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{label}</label>
        <div className="flex gap-2">
            <input
                type="text"
                required
                className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                placeholder="Enter address..."
                value={value}
                onChange={e => onChange(e.target.value)}
            />
            <button
                type="button"
                onClick={onPickerOpen}
                className={`p-2 rounded-xl transition-all ${pickerActive ? 'bg-brand-green text-white' : 'bg-white text-gray-400 hover:text-brand-green border border-gray-200'}`}
            >
                <MapPin size={20} />
            </button>
        </div>
        {!pickerActive && coords && <div className="mt-3 rounded-xl overflow-hidden h-20 opacity-50"><LocationPreviewMap lat={coords[0]} lng={coords[1]} /></div>}
    </div>
)

export default RetailerLogistics;
