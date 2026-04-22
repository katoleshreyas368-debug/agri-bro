import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { MapPin, Calendar, Truck, CheckCircle, X, Search, Plus, ChevronRight, Activity, Wind, CloudRain, Navigation, Package, Phone, Mail, Star, XCircle, Clock, Copy, Wifi, WifiOff, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InlineLocationPicker from '../components/InlineLocationPicker';
import LocationPreviewMap from '../components/LocationPreviewMap';
import { useShipmentTracking } from '../hooks/useShipmentTracking';
import ShipmentCheckoutModal from '../components/ShipmentCheckoutModal';

const DeliveryRouteMap = React.lazy(() => import('../components/DeliveryRouteMap'));

interface LogisticsRequest {
    id: string;
    trackingId?: string;
    cropType: string;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    requestedDate: string;
    status: 'pending' | 'accepted' | 'in-transit' | 'completed' | 'cancelled';
    progress?: number;
    farmerPhone?: string;
    farmerName?: string;
    farmerId?: string;
    buyerEmail?: string;
    aiRoute?: string;
    estimatedDelivery?: string;
    transporterId?: string;
    transporterName?: string;
    paymentStatus?: string;
    review?: { rating: number; comment: string; reviewedBy: string; reviewedAt: string } | null;
    statusHistory?: Array<{ status: string; actor: string; note: string; timestamp: string }>;
}

const FarmerLogistics: React.FC = () => {
    const { user, token } = useAuth();
    const [requests, setRequests] = useState<LogisticsRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LogisticsRequest | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Cancel & Review modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [copied, setCopied] = useState(false);
    const [showPayment, setShowPayment] = useState(false);

    // Location picker state
    const [activePicker, setActivePicker] = useState<'none' | 'fromLocation' | 'toLocation'>('none');

    // Form State
    const [formData, setFormData] = useState({
        cropType: '',
        quantity: 0,
        fromLocation: '',
        toLocation: '',
        requestedDate: '',
        farmerPhone: '',
        buyerEmail: ''
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
        if (!user || !token) return;
        try {
            const res = await fetch('http://localhost:3000/logistics/my', {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store'
            });
            if (res.ok) setRequests(await res.json());
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    }, [user, token]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // ─── NEW: WebSocket live tracking (replaces old setInterval polling) ───
    const shipmentIds = useMemo(() => requests.map(r => r.id), [requests]);
    const { liveUpdates, connected: wsConnected } = useShipmentTracking(shipmentIds);

    // Merge live WebSocket updates into the requests state
    useEffect(() => {
        if (liveUpdates.size === 0) return;
        setRequests(prev => {
            let changed = false;
            const next = prev.map(req => {
                const update = liveUpdates.get(req.id);
                if (update) {
                    changed = true;
                    return { ...req, ...update } as LogisticsRequest;
                }
                return req;
            });
            return changed ? next : prev;
        });
    }, [liveUpdates]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/logistics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const newReq = await res.json();
                setRequests([newReq, ...requests]);
                setSelectedRequest(newReq);
                setFormData({ cropType: '', quantity: 0, fromLocation: '', toLocation: '', requestedDate: '', farmerPhone: '', buyerEmail: '' });
                setShowForm(false);
            }
        } catch (error) {
            console.error("Error creating request", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!selectedRequest) return;
        try {
            const res = await fetch(`http://localhost:3000/logistics/${selectedRequest.id}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason: cancelReason })
            });
            if (res.ok) {
                await fetchRequests();
                setShowCancelModal(false);
                setCancelReason('');
                setSelectedRequest(null);
            }
        } catch (error) { console.error('Cancel failed', error); }
    };

    const handleReview = async () => {
        if (!selectedRequest) return;
        try {
            const res = await fetch(`http://localhost:3000/logistics/${selectedRequest.id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
            });
            if (res.ok) {
                await fetchRequests();
                setShowReviewModal(false);
                setReviewComment('');
                setReviewRating(5);
            }
        } catch (error) { console.error('Review failed', error); }
    };

    const copyTrackingId = (trackingId: string) => {
        navigator.clipboard.writeText(trackingId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

    const activeInTransit = requests.filter(r => r.status === 'in-transit');
    console.log("Active in-transit sessions:", activeInTransit.length);

    return (
        <div className="h-[calc(100vh-80px)] bg-brand-surface text-gray-900 flex overflow-hidden">
            {/* ── Left Sidebar: Shipments & Control ── */}
            <aside className="w-96 bg-white border-r border-gray-200 flex flex-col z-[1500] shadow-xl">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.2em]">Logistics Hub</p>
                            <h1 className="text-xl font-bold mt-1 text-gray-900">Farmer Dashboard</h1>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="p-2.5 bg-brand-green hover:bg-brand-green-dark text-white rounded-xl transition-all shadow-lg shadow-brand-green/20"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* NEW: WebSocket connection indicator */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-brand-green animate-pulse' : 'bg-red-400'}`}></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            {wsConnected ? 'Live Tracking Active' : 'Connecting...'}
                        </span>
                        {wsConnected ? <Wifi size={12} className="text-brand-green" /> : <WifiOff size={12} className="text-red-400" />}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search shipments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/50 transition-all placeholder:text-gray-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 CustomScrollbar">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Shipments</h2>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-[10px] bg-transparent text-brand-green font-bold uppercase tracking-wider outline-none cursor-pointer"
                        >
                            <option value="all">Total ({requests.length})</option>
                            <option value="pending">Pending</option>
                            <option value="in-transit">Live</option>
                            <option value="completed">Done</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {filteredRequests.length === 0 ? (
                        <div className="text-center py-12 opacity-30 text-gray-400">
                            <Truck size={40} className="mx-auto mb-3" />
                            <p className="text-sm">No shipments found</p>
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
                                            <p className="text-[10px] text-gray-400 mt-1.5">{req.quantity} KG • {req.trackingId || req.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 italic">
                                        <MapPin size={10} className="text-brand-green" /> {req.fromLocation}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 italic">
                                        <Navigation size={10} className="text-red-500" /> {req.toLocation}
                                    </div>
                                </div>

                                {req.status === 'in-transit' && (
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center text-[10px] mb-1.5">
                                            <span className="text-blue-500 font-bold uppercase tracking-widest">En Route</span>
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

                                {/* Payment Status Badge */}
                                {req.paymentStatus && (
                                    <div className="mt-3 flex items-center gap-1.5">
                                        <CreditCard size={10} className={req.paymentStatus === 'BUYER_PAYMENT_DONE' || req.paymentStatus === 'FARMER_NOTIFIED' ? 'text-green-500' : 'text-gray-400'} />
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                            req.paymentStatus === 'BUYER_PAYMENT_DONE' || req.paymentStatus === 'FARMER_NOTIFIED'
                                                ? 'text-green-600' : req.paymentStatus === 'REFUND_INITIATED' ? 'text-orange-500' : 'text-gray-400'
                                        }`}>
                                            {req.paymentStatus === 'BUYER_PAYMENT_DONE' ? '✓ Paid'
                                                : req.paymentStatus === 'FARMER_NOTIFIED' ? '✓ Paid · Notified'
                                                : req.paymentStatus === 'REFUND_INITIATED' ? '↩ Refund Initiated'
                                                : req.paymentStatus}
                                        </span>
                                    </div>
                                )}
                                {!req.paymentStatus && (req.status === 'accepted' || req.status === 'pending') && (
                                    <div className="mt-3 flex items-center gap-1.5">
                                        <CreditCard size={10} className="text-amber-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Freight Unpaid</span>
                                    </div>
                                )}

                                {selectedRequest?.id === req.id && (
                                    <div className="absolute right-3 bottom-3 opacity-40 text-brand-green">
                                        <ChevronRight size={16} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Left Side Footer Stats */}
                <div className="p-6 bg-gray-50 mt-auto border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-2xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Daily Fuel</p>
                            <p className="text-lg font-bold mt-0.5 text-brand-green">14.2 GAL</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Uptime</p>
                            <p className="text-lg font-bold mt-0.5 text-blue-500">99.8%</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Main Panel: Integrated Map & Telemetry ── */}
            <main className="flex-1 relative bg-white z-0">
                <div className="h-full w-full">
                    {selectedRequest ? (
                        <Suspense fallback={
                            <div className="h-full w-full flex flex-col items-center justify-center bg-brand-surface">
                                <Activity className="text-brand-green animate-pulse mb-4" size={40} />
                                <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Initializing Secure Link...</p>
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
                            <Truck size={64} className="text-gray-200 mb-6" />
                            <h3 className="text-xl font-bold text-gray-300">Select a shipment to track</h3>
                        </div>
                    )}
                </div>

                {/* Overlay: Top Navigation Bar (Integrated in Map Area) */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-[1100]">
                    <div className="flex gap-4 pointer-events-auto">
                        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl p-4 flex items-center gap-6 shadow-2xl">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Elevation</span>
                                <span className="text-sm font-bold text-gray-900">1,240m</span>
                            </div>
                            <div className="w-px h-8 bg-gray-100"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Coordinates</span>
                                <span className="text-sm font-bold text-brand-green tracking-tighter">18.52°N, 73.85°E</span>
                            </div>
                        </div>

                        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                                <CloudRain size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Local Weather</p>
                                <p className="text-sm font-bold text-gray-900">Rain Expectancy 12%</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl p-4 flex items-center gap-6 pointer-events-auto shadow-2xl z-[1100]">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">System Status</p>
                            <div className="flex items-center gap-2 justify-end mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
                                <span className="text-xs font-bold text-brand-green uppercase tracking-tighter">Secure Link Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overlay: Bottom Details Panel (Integrated in Map Area) */}
                {selectedRequest && (
                    <div className="absolute bottom-6 left-6 right-6 pointer-events-none z-[1100]">
                        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-[32px] p-6 pointer-events-auto shadow-2xl max-w-5xl mx-auto border-t-2 border-t-brand-green/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between">
                                <div className="flex items-center gap-5 mb-4 md:mb-0">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-gray-100">
                                        {selectedRequest.cropType === 'Wheat' ? '🌾' : selectedRequest.cropType === 'Rice' ? '🍚' : '📦'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">{selectedRequest.cropType}</h2>
                                            <StatusBadge status={selectedRequest.status} large />
                                        </div>
                                        <p className="text-gray-500 text-sm mt-1 font-medium flex items-center gap-2">
                                            {selectedRequest.trackingId && (
                                                <>
                                                    <button onClick={() => copyTrackingId(selectedRequest.trackingId!)} className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg transition-all">
                                                        <Copy size={10} />
                                                        <span className="text-gray-900 font-bold tracking-tighter text-xs">{selectedRequest.trackingId}</span>
                                                    </button>
                                                    {copied && <span className="text-brand-green text-[10px] font-bold">Copied!</span>}
                                                    <span className="opacity-20">•</span>
                                                </>
                                            )}
                                            Sourced from <span className="text-brand-green font-bold">{selectedRequest.fromLocation}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Quantity</p>
                                        <p className="text-xl font-black text-gray-900">{selectedRequest.quantity} <span className="text-xs text-gray-400">KG</span></p>
                                    </div>
                                    <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destined For</p>
                                        <p className="text-xl font-black text-red-500 uppercase tracking-tighter">{selectedRequest.toLocation}</p>
                                    </div>
                                    <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                                    <div className="flex flex-col gap-2">
                                        {/* Pay Freight button */}
                                        {(selectedRequest.status === 'accepted' || selectedRequest.status === 'pending') && !selectedRequest.paymentStatus && (
                                            <button
                                                onClick={() => setShowPayment(true)}
                                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
                                            >
                                                <CreditCard size={14} />
                                                Pay Freight
                                            </button>
                                        )}
                                        {/* Paid badge */}
                                        {selectedRequest.paymentStatus && (selectedRequest.paymentStatus === 'BUYER_PAYMENT_DONE' || selectedRequest.paymentStatus === 'FARMER_NOTIFIED') && (
                                            <div className="bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                Freight Paid
                                            </div>
                                        )}
                                        {selectedRequest.status === 'pending' && (
                                            <button onClick={() => setShowCancelModal(true)} className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2">
                                                <XCircle size={14} /> Cancel
                                            </button>
                                        )}
                                        {selectedRequest.status === 'completed' && !selectedRequest.review && (
                                            <button onClick={() => setShowReviewModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
                                                <Star size={14} /> Rate Delivery
                                            </button>
                                        )}
                                        {selectedRequest.review && (
                                            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill={s <= selectedRequest.review!.rating ? 'currentColor' : 'none'} />)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* AI Route & ETA bar */}
                            {(selectedRequest.aiRoute || selectedRequest.estimatedDelivery) && (
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-[11px]">
                                    {selectedRequest.aiRoute && selectedRequest.aiRoute !== 'Route optimization unavailable' && (
                                        <div className="flex items-center gap-2 text-gray-500 flex-1">
                                            <Navigation size={12} className="text-brand-green shrink-0" />
                                            <span className="truncate"><strong className="text-gray-700">AI Route:</strong> {selectedRequest.aiRoute}</span>
                                        </div>
                                    )}
                                    {selectedRequest.estimatedDelivery && (
                                        <div className="flex items-center gap-1.5 text-blue-500 font-bold shrink-0">
                                            <Clock size={12} /> ETA: {selectedRequest.estimatedDelivery}
                                        </div>
                                    )}
                                </div>
                            )}
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
                            <span className="text-[10px] font-bold text-brand-green uppercase tracking-[0.3em]">New Shipment</span>
                            <h2 className="text-3xl font-black text-gray-900 mt-1">Initiate Logistics</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Crop Variety</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                                        placeholder="e.g. Alphonso Mangoes"
                                        value={formData.cropType}
                                        onChange={e => setFormData({ ...formData, cropType: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Gross Weight (KG)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                                        placeholder="0.00"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <LocationGrid
                                    label="Origin / Farm Pickup"
                                    value={formData.fromLocation}
                                    onChange={(v: string) => setFormData({ ...formData, fromLocation: v })}
                                    onPickerOpen={() => setActivePicker('fromLocation')}
                                    pickerActive={activePicker === 'fromLocation'}
                                    coords={coords.from}
                                />

                                <LocationGrid
                                    label="Terminal Destination"
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
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Operation Date</label>
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

                            {/* Notification Contact Info */}
                            <div className="bg-gradient-to-r from-blue-50 to-brand-green/5 p-5 rounded-2xl border border-blue-100/50">
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Mail size={12} /> Notification Contacts (Optional)
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                            <input
                                                type="tel"
                                                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                                                placeholder="+91..."
                                                value={formData.farmerPhone}
                                                onChange={e => setFormData({ ...formData, farmerPhone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Buyer Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                            <input
                                                type="email"
                                                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder:text-gray-300"
                                                placeholder="buyer@email.com"
                                                value={formData.buyerEmail}
                                                onChange={e => setFormData({ ...formData, buyerEmail: e.target.value })}
                                            />
                                        </div>
                                    </div>
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
                                    <>Authorize Dispatch <Navigation size={20} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelModal && selectedRequest && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[28px] w-full max-w-md p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-50 rounded-xl text-red-500"><XCircle size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Cancel Shipment</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{selectedRequest.trackingId || selectedRequest.id}</p>
                            </div>
                        </div>
                        <textarea
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none h-24 placeholder:text-gray-300"
                            placeholder="Reason for cancellation (optional)..."
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                        />
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-600 transition-all">Keep It</button>
                            <button onClick={handleCancel} className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-red-500/20">Confirm Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && selectedRequest && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[28px] w-full max-w-md p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-amber-50 rounded-xl text-amber-500"><Star size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Rate Delivery</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{selectedRequest.trackingId || selectedRequest.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setReviewRating(s)} className="transition-transform hover:scale-125">
                                    <Star size={36} className={s <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none h-24 placeholder:text-gray-300"
                            placeholder="Share your experience (optional)..."
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                        />
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-600 transition-all">Skip</button>
                            <button onClick={handleReview} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-amber-500/20">Submit Review</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Shipment Payment Checkout Modal ── */}
            {showPayment && selectedRequest && (
                <ShipmentCheckoutModal
                    shipment={{
                        id: selectedRequest.id,
                        trackingId: selectedRequest.trackingId,
                        cropType: selectedRequest.cropType,
                        quantity: selectedRequest.quantity,
                        fromLocation: selectedRequest.fromLocation,
                        toLocation: selectedRequest.toLocation,
                        freightAmount: Math.round(selectedRequest.quantity * 8),
                        farmerId: selectedRequest.farmerId,
                        farmerName: selectedRequest.farmerName,
                        farmerPhone: selectedRequest.farmerPhone,
                        transporterId: selectedRequest.transporterId,
                        transporterName: selectedRequest.transporterName,
                    }}
                    buyerName={user?.name || ''}
                    buyerPhone={''}
                    buyerEmail={''}
                    userRole="farmer"
                    onClose={() => setShowPayment(false)}
                    onPaymentComplete={(shipmentId, paymentId) => {
                        console.log('✅ Freight paid:', shipmentId, paymentId);
                        setShowPayment(false);
                        fetchRequests();
                    }}
                />
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

export default FarmerLogistics;
