"use client";

import { MapContainer, TileLayer, LayersControl, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { formatDistanceToNow } from 'date-fns';
import type { Incident, Flight, Earthquake, EonetEvent, Ship } from '@/types';
import { Volcano, Wind, Droplets, Ship as ShipIcon } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';


const planeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="yellow" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;

const earthquakeSVG = (magnitude: number) => {
    const radius = 2 + magnitude * 1.5;
    const color = magnitude > 5 ? 'hsl(var(--destructive))' : magnitude > 3 ? 'hsl(var(--primary))' : 'yellow';
    return `<svg width="${radius*2}" height="${radius*2}" viewBox="0 0 ${radius*2} ${radius*2}" xmlns="http://www.w3.org/2000/svg"><circle cx="${radius}" cy="${radius}" r="${radius-1}" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="1"/></svg>`;
}

const eonetIcon = (category: string) => {
    let icon;
    switch (category.toLowerCase()) {
        case 'volcanoes':
            icon = <Volcano color="hsl(var(--destructive))" size={20} />;
            break;
        case 'severe storms':
            icon = <Wind color="cyan" size={20} />;
            break;
        case 'floods':
            icon = <Droplets color="blue" size={20} />;
            break;
        default: // Wildfires, etc.
            icon = <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="hsl(var(--primary))" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
    }
    return L.divIcon({
        html: ReactDOMServer.renderToString(icon),
        className: 'eonet-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
};


interface MapViewProps {
  incidents: Incident[];
  flights: Flight[];
  earthquakes: Earthquake[];
  eonetEvents: EonetEvent[];
  ships: Ship[];
  openWeatherMapApiKey?: string;
}

export default function MapView({ 
    incidents, 
    flights,
    earthquakes,
    eonetEvents,
    ships,
    openWeatherMapApiKey
}: MapViewProps) {
  // Center on a global view
  const position: [number, number] = [20, 0];
  const zoom = 2;

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
            <LayersControl position="topright">
                <LayersControl.Overlay checked name="Fires (NASA)">
                    <GeoJSON 
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
                          radius: 3 + Math.min((incident.frp || 0) / 50, 8),
                          color: 'hsl(var(--destructive))',
                          fillColor: 'hsl(var(--destructive))',
                          fillOpacity: 0.6,
                          weight: 1,
                        });
                      }}
                      onEachFeature={(feature, layer) => {
                        const incident = feature.properties as Incident;
                        layer.bindTooltip(`
                            <div class="text-sm font-mono">
                                <h3 class="font-bold text-base mb-1 text-primary">Thermal Anomaly</h3>
                                <p><strong>Intensity (FRP):</strong> ${incident.frp || 'N/A'}</p>
                                <p class="text-xs mt-2 text-muted-foreground">
                                    ${formatDistanceToNow(incident.timestamp.toDate(), { addSuffix: true })}
                                </p>
                            </div>
                        `);
                      }}
                    />
                </LayersControl.Overlay>
                 <LayersControl.Overlay checked name="Flights">
                    <GeoJSON
                        key={JSON.stringify(flights)} 
                        data={{
                            type: 'FeatureCollection',
                            features: flights.map(flight => ({
                                type: 'Feature',
                                properties: flight,
                                geometry: {
                                    type: 'Point',
                                    coordinates: [flight.longitude, flight.latitude]
                                }
                            }))
                        }}
                        pointToLayer={(feature, latlng) => {
                            const flight = feature.properties as Flight;
                            const icon = L.divIcon({
                                html: `<div style="transform: rotate(${flight.direction - 90}deg);">${planeSVG}</div>`,
                                className: 'flight-icon',
                                iconSize: [24, 24],
                                iconAnchor: [12, 12],
                            });
                            return L.marker(latlng, { icon });
                        }}
                        onEachFeature={(feature, layer) => {
                            const flight = feature.properties as Flight;
                            layer.bindPopup(`
                                <div class="text-sm font-mono">
                                    <h3 class="font-bold text-base mb-1 text-yellow-400">Flight: ${flight.flight_iata || 'N/A'}</h3>
                                    <p><strong>Airline:</strong> ${flight.airline_name}</p>
                                    <p><strong>Route:</strong> ${flight.dep_iata} &rarr; ${flight.arr_iata}</p>
                                    <p class="text-xs mt-2 text-muted-foreground">
                                        Lat: ${flight.latitude.toFixed(4)}, Lon: ${flight.longitude.toFixed(4)}
                                    </p>
                                </div>
                            `);
                        }}
                    />
                </LayersControl.Overlay>
                 <LayersControl.Overlay checked name="Earthquakes (USGS)">
                    <GeoJSON
                      key={JSON.stringify(earthquakes)}
                      data={{
                          type: 'FeatureCollection',
                          features: earthquakes.map(quake => ({
                              type: 'Feature',
                              properties: quake,
                              geometry: {
                                  type: 'Point',
                                  coordinates: [quake.longitude, quake.latitude]
                              }
                          }))
                      }}
                      pointToLayer={(feature, latlng) => {
                        const quake = feature.properties as Earthquake;
                        const icon = L.divIcon({
                            html: earthquakeSVG(quake.magnitude),
                            className: 'earthquake-icon',
                            iconSize: [2 + quake.magnitude * 3, 2 + quake.magnitude * 3],
                            iconAnchor: [1 + quake.magnitude * 1.5, 1 + quake.magnitude * 1.5],
                        });
                        return L.marker(latlng, { icon });
                      }}
                      onEachFeature={(feature, layer) => {
                        const quake = feature.properties as Earthquake;
                        layer.bindPopup(`
                            <div class="text-sm font-mono">
                                <h3 class="font-bold text-base mb-1 text-yellow-400">Earthquake: M ${quake.magnitude.toFixed(1)}</h3>
                                <p><strong>Location:</strong> ${quake.place}</p>
                                <p class="text-xs mt-2 text-muted-foreground">
                                    ${formatDistanceToNow(quake.timestamp.toDate(), { addSuffix: true })}
                                </p>
                            </div>
                        `);
                      }}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name="Natural Events (EONET)">
                    <GeoJSON
                      key={JSON.stringify(eonetEvents)}
                      data={{
                          type: 'FeatureCollection',
                          features: eonetEvents.map(event => ({
                              type: 'Feature',
                              properties: event,
                              geometry: {
                                  type: 'Point',
                                  coordinates: [event.longitude, event.latitude]
                              }
                          }))
                      }}
                      pointToLayer={(feature, latlng) => {
                        const event = feature.properties as EonetEvent;
                        return L.marker(latlng, { icon: eonetIcon(event.category) });
                      }}
                      onEachFeature={(feature, layer) => {
                        const event = feature.properties as EonetEvent;
                        layer.bindPopup(`
                            <div class="text-sm font-mono">
                                <h3 class="font-bold text-base mb-1 text-cyan-400">Event: ${event.category}</h3>
                                <p><strong>Title:</strong> ${event.title}</p>
                                <p class="text-xs mt-2 text-muted-foreground">
                                    ${formatDistanceToNow(event.timestamp.toDate(), { addSuffix: true })}
                                </p>
                            </div>
                        `);
                      }}
                    />
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name="Shipping">
                    <GeoJSON
                      key={JSON.stringify(ships)}
                      data={{
                          type: 'FeatureCollection',
                          features: ships.map(ship => ({
                              type: 'Feature',
                              properties: ship,
                              geometry: {
                                  type: 'Point',
                                  coordinates: [ship.longitude, ship.latitude]
                              }
                          }))
                      }}
                      pointToLayer={(feature, latlng) => {
                        return new L.CircleMarker(latlng, {
                          radius: 3,
                          color: 'cyan',
                          fillColor: 'cyan',
                          fillOpacity: 0.7,
                          weight: 1,
                        });
                      }}
                       onEachFeature={(feature, layer) => {
                        const ship = feature.properties as Ship;
                        layer.bindTooltip(`
                            <div class="text-sm font-mono">
                                <h3 class="font-bold text-base mb-1 text-cyan-400">Ship</h3>
                                 <p class="text-xs mt-2 text-muted-foreground">
                                    Lat: ${ship.latitude.toFixed(4)}, Lon: ${ship.longitude.toFixed(4)}
                                </p>
                            </div>
                        `);
                      }}
                    />
                </LayersControl.Overlay>
                {openWeatherMapApiKey && (
                  <>
                    <LayersControl.Overlay name="Weather (Clouds)">
                      <TileLayer
                        url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${openWeatherMapApiKey}`}
                        attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
                        opacity={0.6}
                      />
                    </LayersControl.Overlay>
                    <LayersControl.Overlay name="Weather (Wind)">
                      <TileLayer
                        url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${openWeatherMapApiKey}`}
                        attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
                        opacity={0.6}
                      />
                    </LayersControl.Overlay>
                  </>
                )}
            </LayersControl>
        </MapContainer>
    </>
  );
}
