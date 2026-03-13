"use client";

import { MapContainer, TileLayer, LayersControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { formatDistanceToNow } from 'date-fns';
import type { Incident } from '@/types';
import type { FeatureCollection, Point, LineString } from 'geojson';

interface MapViewProps {
  incidents: Incident[];
  powerPlants: FeatureCollection<Point, {name: string, type: string}>;
  railways: FeatureCollection<LineString, {name: string}>;
  ukraineBoundary: FeatureCollection;
  affectedPowerIds: Set<string>;
  affectedRailIds: Set<string>;
}

// Base icon for power plants
const powerPlantIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="cyan" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Icon for affected power plants
const affectedPowerPlantIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="orange" stroke="orange" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-flash"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});


export default function MapView({ incidents, powerPlants, railways, ukraineBoundary, affectedPowerIds, affectedRailIds }: MapViewProps) {
  const position: [number, number] = [48.3794, 31.1656]; // Ukraine center
  const zoom = 6;

  const railStyle = (feature?: GeoJSON.Feature) => {
    if (feature && affectedRailIds.has(feature.id as string)) {
        return { color: 'hsl(var(--primary))', weight: 3, className: 'animate-flash' };
    }
    return { color: 'hsl(var(--secondary))', weight: 1.5, opacity: 0.8 };
  };

  const onEachPowerPlant = (feature: GeoJSON.Feature<Point, {name: string, type: string}>, layer: L.Layer) => {
    if (feature.properties) {
        const { name, type } = feature.properties;
        layer.bindPopup(`<h3 class="font-bold text-base mb-1 text-cyan-400">${type} Plant</h3><p>${name}</p>`);
    }
  }

  return (
    <>
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
             <GeoJSON 
                key="ukraine-boundary" 
                data={ukraineBoundary} 
                style={{
                    color: 'hsl(var(--primary))',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.15,
                    fillColor: 'hsl(var(--primary))',
                }}
            />
            <LayersControl position="topright">
                <LayersControl.Overlay checked name="Fires (NASA)">
                    <GeoJSON 
                      key="incidents"
                      data={{
                          type: 'FeatureCollection',
                          features: incidents.map(incident => ({
                              type: 'Feature',
                              properties: incident,
                              geometry: {
                                  type: 'Point',
                                  coordinates: [incident.longitude, incident.latitude]
                              }
                          }))
                      }}
                      pointToLayer={(feature, latlng) => {
                        const incident = feature.properties as Incident;
                        return new L.CircleMarker(latlng, {
                          radius: 5 + Math.min((incident.frp || 0) / 40, 12),
                          color: 'hsl(var(--destructive))',
                          fillColor: 'hsl(var(--destructive))',
                          fillOpacity: 0.6,
                          weight: 1.5,
                        });
                      }}
                      onEachFeature={(feature, layer) => {
                        const incident = feature.properties as Incident;
                        layer.bindPopup(`
                            <div class="text-sm font-mono">
                                <h3 class="font-bold text-base mb-1 text-primary">Thermal Anomaly</h3>
                                <p><strong>Time:</strong> ${formatDistanceToNow(incident.timestamp.toDate(), { addSuffix: true })}</p>
                                <p><strong>Intensity (FRP):</strong> ${incident.frp ?? 'N/A'}</p>
                                <p><strong>Brightness:</strong> ${incident.brightness ? `${incident.brightness}K` : 'N/A'}</p>
                                <p class="text-xs mt-2 text-muted-foreground">
                                    Lat: ${incident.latitude.toFixed(4)}, Lon: ${incident.longitude.toFixed(4)}
                                </p>
                            </div>
                        `);
                      }}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name="Railways">
                    <GeoJSON key="railways" data={railways} style={railStyle} />
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name="Power Grid">
                    <GeoJSON 
                        key="power"
                        data={powerPlants} 
                        pointToLayer={(feature, latlng) => {
                            const isAffected = affectedPowerIds.has(feature.id as string);
                            return L.marker(latlng, { 
                                icon: isAffected ? affectedPowerPlantIcon : powerPlantIcon 
                            });
                        }}
                        onEachFeature={onEachPowerPlant}
                    />
                </LayersControl.Overlay>
                 <LayersControl.Overlay name="Flights (Placeholder)">
                    {/* Placeholder for flights layer */}
                </LayersControl.Overlay>
                <LayersControl.Overlay name="Weather (Placeholder)">
                    {/* Placeholder for weather layer */}
                </LayersControl.Overlay>
            </LayersControl>
        </MapContainer>
    </>
  );
}
