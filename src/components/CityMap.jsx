import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon issue in React
// Move to client-side only execution
if (typeof window !== 'undefined') {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

function ChangeView({ center, zoom }) {
    const map = useMap();
    if (center) {
        map.setView(center, zoom);
    }
    return null;
}

export default function CityMap() {
    const [position, setPosition] = useState(null); // [lat, lng]
    const [address, setAddress] = useState('');
    const [authorityName, setAuthorityName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleCalculation = async (event) => {
            const { input } = event.detail;
            if (input && input.city && input.city.amt_adresse) {
                const cityData = input.city;
                setAddress(cityData.amt_adresse);
                setAuthorityName(cityData.amt_name || 'Zuständige Behörde');
                setLoading(true);

                // Geocode Address
                try {
                    const query = encodeURIComponent(cityData.amt_adresse);
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
                    if (!response.ok) throw new Error('Geocoding failed');

                    const data = await response.json();

                    if (data && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lon = parseFloat(data[0].lon);
                        setPosition([lat, lon]);
                    } else {
                        // Fallback: Geocode just the City
                        const cityQuery = encodeURIComponent(cityData.stadt);
                        const cityResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cityQuery}&limit=1`);
                        if (cityResp.ok) {
                            const cityGeo = await cityResp.json();
                            if (cityGeo && cityGeo.length > 0) {
                                setPosition([parseFloat(cityGeo[0].lat), parseFloat(cityGeo[0].lon)]);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Map Geocoding Error:", err);
                    setLoading(false);
                } finally {
                    setLoading(false);
                }
            }
        };

        window.addEventListener('benefit-calculation-completed', handleCalculation);
        return () => window.removeEventListener('benefit-calculation-completed', handleCalculation);
    }, []);

    if (!position) return null;

    return (
        <div className="w-full h-[300px] mt-6 rounded-2xl overflow-hidden relative z-0 border border-slate-200 shadow-inner">
            <MapContainer
                center={position}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <ChangeView center={position} zoom={15} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}>
                    <Popup>
                        <strong>{authorityName}</strong><br />
                        {address}
                    </Popup>
                </Marker>
            </MapContainer>
            {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[1000] flex items-center justify-center">
                    <span className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                </div>
            )}
        </div>
    );
}
