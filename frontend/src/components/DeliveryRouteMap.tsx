import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../utils/fixLeafletIcon";

// Custom coloured marker icons
const greenIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Truck icon for tracking
const truckIcon = new L.DivIcon({
    html: '<div style="font-size:28px;filter:drop-shadow(1px 1px 2px rgba(0,0,0,0.4))">🚛</div>',
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

interface DeliveryRouteMapProps {
    fromLocation: string;
    toLocation: string;
    label?: string;
    height?: string;
    /** Progress 0–100 for truck tracking. When provided, a truck marker animates along the route. */
    progress?: number;
}

interface Coords { lat: number; lng: number; }
interface RouteData { from: Coords; to: Coords; route: [number, number][]; }

// --- Geocode via Nominatim ---
async function geocode(place: string, signal?: AbortSignal): Promise<Coords | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1&countrycodes=in`;
        const res = await fetch(url, { signal });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (err: any) {
        if (err.name !== "AbortError") console.error("Geocoding failed:", place, err);
    }
    return null;
}

// --- Route via OSRM ---
async function fetchRoute(from: Coords, to: Coords, signal?: AbortSignal): Promise<[number, number][]> {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal });
        if (!res.ok) return [];
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
            return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        }
    } catch (err: any) {
        if (err.name !== "AbortError") console.error("OSRM failed:", err);
    }
    return [];
}

// --- Interpolate position along route ---
function getPositionAlongRoute(route: [number, number][], progress: number): [number, number] {
    if (route.length === 0) return [20.5, 78.9]; // India center fallback
    if (progress <= 0) return route[0];
    if (progress >= 100) return route[route.length - 1];

    // Calculate cumulative distances
    const distances: number[] = [0];
    for (let i = 1; i < route.length; i++) {
        const [lat1, lng1] = route[i - 1];
        const [lat2, lng2] = route[i];
        const d = Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2);
        distances.push(distances[i - 1] + d);
    }

    const totalDist = distances[distances.length - 1];
    const targetDist = (progress / 100) * totalDist;

    // Find the segment where the truck is
    for (let i = 1; i < distances.length; i++) {
        if (distances[i] >= targetDist) {
            const segStart = distances[i - 1];
            const segLen = distances[i] - segStart;
            const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;
            const [lat1, lng1] = route[i - 1];
            const [lat2, lng2] = route[i];
            return [lat1 + t * (lat2 - lat1), lng1 + t * (lng2 - lng1)];
        }
    }

    return route[route.length - 1];
}

// Auto-fit map bounds
function FitBounds({ points }: { points: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 1) {
            const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [points, map]);
    return null;
}

export default function DeliveryRouteMap({
    fromLocation, toLocation, label, height = "400px", progress,
}: DeliveryRouteMapProps) {
    const [routeData, setRouteData] = useState<RouteData | null>(null);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

    const loadRoute = useCallback(async (from: string, to: string, signal: AbortSignal) => {
        setStatus("loading");
        setRouteData(null);
        if (!from || !to) { setStatus("error"); return; }

        const [fc, tc] = await Promise.all([geocode(from, signal), geocode(to, signal)]);
        if (signal.aborted) return;
        if (!fc || !tc) { setStatus("error"); return; }

        const routePoints = await fetchRoute(fc, tc, signal);
        if (signal.aborted) return;

        const finalRoute = routePoints.length > 0
            ? routePoints
            : ([[fc.lat, fc.lng], [tc.lat, tc.lng]] as [number, number][]);

        setRouteData({ from: fc, to: tc, route: finalRoute });
        setStatus("ready");
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => loadRoute(fromLocation, toLocation, controller.signal), 100);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [fromLocation, toLocation, loadRoute]);

    // Compute truck position based on progress
    const truckPos = useMemo(() => {
        if (routeData && progress != null && progress >= 0) {
            return getPositionAlongRoute(routeData.route, progress);
        }
        return null;
    }, [routeData, progress]);

    if (status === "error") {
        return (
            <div style={{ height }} className="flex items-center justify-center bg-red-50 rounded-xl border border-red-200 p-4">
                <div className="text-center">
                    <p className="text-red-600 font-medium text-sm mb-1">Unable to load map</p>
                    <p className="text-red-500 text-xs">Location not found</p>
                    <button
                        onClick={() => loadRoute(fromLocation, toLocation, new AbortController().signal)}
                        className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    if (status === "loading") {
        return (
            <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading route for {fromLocation} → {toLocation}...</p>
                </div>
            </div>
        );
    }

    if (!routeData) return null;

    const center: [number, number] = [
        (routeData.from.lat + routeData.to.lat) / 2,
        (routeData.from.lng + routeData.to.lng) / 2,
    ];

    return (
        <div>
            {label && (
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                    <span className="text-lg">📍</span> Showing route for <strong>{label}</strong>
                </p>
            )}
            <div style={{ height, width: "100%", borderRadius: "12px", overflow: "hidden" }}>
                <MapContainer center={center} zoom={7} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Streets">
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite">
                            <TileLayer
                                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Dark">
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>
                    <FitBounds points={routeData.route} />

                    {/* Pickup marker */}
                    <Marker position={[routeData.from.lat, routeData.from.lng]} icon={greenIcon}>
                        <Popup>📦 <strong>Pickup:</strong> {fromLocation}</Popup>
                    </Marker>

                    {/* Delivery marker */}
                    <Marker position={[routeData.to.lat, routeData.to.lng]} icon={redIcon}>
                        <Popup>🏁 <strong>Delivery:</strong> {toLocation}</Popup>
                    </Marker>

                    {/* Route polyline */}
                    {routeData.route.length > 0 && (
                        <Polyline positions={routeData.route} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.8 }} />
                    )}

                    {/* Truck tracking marker */}
                    {truckPos && (
                        <Marker position={truckPos} icon={truckIcon}>
                            <Popup>🚛 <strong>In Transit</strong><br />{progress}% complete</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
