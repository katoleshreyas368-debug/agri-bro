import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../utils/fixLeafletIcon";

interface FarmerLocation {
    id: number;
    name: string;
    position: [number, number];
}

const defaultFarmers: FarmerLocation[] = [
    { id: 1, name: "🌾 Farmer A — Pune Central", position: [18.5204, 73.8567] },
    { id: 2, name: "🌽 Farmer B — Shivajinagar", position: [18.5308, 73.8474] },
    { id: 3, name: "🍅 Farmer C — Kothrud", position: [18.5074, 73.8077] },
];

interface AgriMapProps {
    farmers?: FarmerLocation[];
    center?: [number, number];
    zoom?: number;
}

export default function AgriMap({
    farmers = defaultFarmers,
    center = [18.5204, 73.8567],
    zoom = 13,
}: AgriMapProps) {
    return (
        <div style={{ height: "500px", width: "100%", borderRadius: "16px", overflow: "hidden" }}>
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {farmers.map((farmer) => (
                    <Marker key={farmer.id} position={farmer.position}>
                        <Popup>
                            {farmer.name}
                            <br />
                            AGRIBro Delivery Point
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
