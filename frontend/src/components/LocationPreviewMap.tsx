import { MapContainer, TileLayer, Marker, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon
const pinIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface LocationPreviewMapProps {
    lat: number;
    lng: number;
}

export default function LocationPreviewMap({ lat, lng }: LocationPreviewMapProps) {
    return (
        <div style={{ height: '200px', width: '100%', marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <MapContainer
                center={[lat, lng]}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                dragging={false} // Static feel
                zoomControl={true}
            >
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
                </LayersControl>
                <Marker position={[lat, lng]} icon={pinIcon} />
            </MapContainer>
        </div>
    );
}
