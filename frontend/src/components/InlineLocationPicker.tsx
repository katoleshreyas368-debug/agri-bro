import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Check } from "lucide-react";

// Fix leaflet icon
const pinIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface InlineLocationPickerProps {
    onConfirm: (locationName: string, lat: number, lng: number) => void;
    onCancel: () => void;
    initialLat?: number;
    initialLng?: number;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
        const res = await fetch(url);
        if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const data = await res.json();

        const addr = data.address || {};
        const specific = addr.road || addr.neighbourhood || addr.suburb || addr.village || addr.hamlet;
        const city = addr.city || addr.town || addr.county || addr.state_district;

        if (specific && city && specific !== city) {
            return `${specific}, ${city}`;
        } else if (specific) {
            return specific;
        } else if (city) {
            return city;
        }
        return data.display_name?.split(",").slice(0, 2).join(",") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// Helper to invalidate map size when opened in modal/tabs to prevent rendering glitches
function MapInvalidator() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100); // 100ms delay to allow modal animation to finish
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

export default function InlineLocationPicker({ onConfirm, onCancel, initialLat, initialLng }: InlineLocationPickerProps) {
    const [selectedPos, setSelectedPos] = useState<[number, number] | null>(initialLat && initialLng ? [initialLat, initialLng] : null);
    const [placeName, setPlaceName] = useState("");
    const [loading, setLoading] = useState(false);

    // Initial load reverse geocode if provided
    useEffect(() => {
        if (initialLat && initialLng && !placeName) {
            reverseGeocode(initialLat, initialLng).then(setPlaceName);
        }
    }, [initialLat, initialLng]);

    const handleMapClick = useCallback(async (lat: number, lng: number) => {
        setSelectedPos([lat, lng]);
        setLoading(true);
        const name = await reverseGeocode(lat, lng);
        setPlaceName(name);
        setLoading(false);
    }, []);

    const handleConfirm = () => {
        if (placeName && selectedPos) {
            onConfirm(placeName, selectedPos[0], selectedPos[1]);
        }
    };

    const indiaCenter: [number, number] = [20.5937, 78.9629];

    return (
        <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white w-full">
            <div style={{ height: "300px", position: "relative" }} className="w-full">
                <MapContainer
                    center={selectedPos || indiaCenter}
                    zoom={selectedPos ? 13 : 5}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                    className="z-0"
                >
                    <MapInvalidator />
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
                    <MapClickHandler onLocationSelect={handleMapClick} />
                    {selectedPos && <Marker position={selectedPos} icon={pinIcon} />}
                </MapContainer>
            </div>

            {/* Footer */}
            <div className="p-3 bg-white border-t flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700 flex-1 truncate">
                    <MapPin size={18} className="text-red-500 shrink-0" />
                    {loading ? (
                        <span className="text-gray-400 italic">Locating...</span>
                    ) : (
                        <span className="font-medium truncate">{placeName || "Click map to select location"}</span>
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!placeName || loading}
                        className="px-4 py-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Check size={16} /> Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
