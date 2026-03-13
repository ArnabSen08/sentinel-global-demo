"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { formatDistanceToNow } from 'date-fns';
import type { Incident } from '@/types';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  incidents: Incident[];
}

export default function MapView({ incidents }: MapViewProps) {
  const position: [number, number] = [48.3794, 31.1656]; // Ukraine center
  const zoom = 6;

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%', backgroundColor: 'hsl(var(--background))' }}
      className="absolute inset-0 z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {incidents.map(incident => (
         <CircleMarker
          key={incident.id}
          center={[incident.latitude, incident.longitude]}
          pathOptions={{
            color: 'hsl(var(--destructive))',
            fillColor: 'hsl(var(--destructive))',
            fillOpacity: 0.6,
            weight: 1.5,
          }}
          radius={5 + Math.min((incident.frp || 0) / 40, 12)} // Scale radius based on fire radiative power
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold text-base mb-1 text-accent">Thermal Anomaly</h3>
              <p><strong>Time:</strong> {formatDistanceToNow(incident.timestamp.toDate(), { addSuffix: true })}</p>
              <p><strong>Intensity (FRP):</strong> {incident.frp ?? 'N/A'}</p>
              <p><strong>Brightness:</strong> {incident.brightness ? `${incident.brightness}K` : 'N/A'}</p>
              <p className="text-xs mt-2 text-muted-foreground">
                Lat: {incident.latitude.toFixed(4)}, Lon: {incident.longitude.toFixed(4)}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
