import { useState, useEffect } from 'react';
import type { Incident, Flight, Earthquake, Ship, WeatherUpdate, NewsArticle, IssPosition, EonetEvent } from '@/types';
import { Timestamp } from 'firebase/firestore'; // Note: retaining Timestamp usage if types require it, but using fake timestamps

// Helper to generate a random coordinate
const randomLat = () => Math.random() * 160 - 80;
const randomLon = () => Math.random() * 360 - 180;

// Fake Firebase Timestamp shim for compatibility with types
const makeFakeTimestamp = () => ({
  seconds: Math.floor(Date.now() / 1000),
  nanoseconds: 0,
  toDate: () => new Date(),
  toMillis: () => Date.now(),
  isEqual: () => false,
  valueOf: () => Date.now().toString()
}) as any;

export function useLiveData() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [weather, setWeather] = useState<WeatherUpdate[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [issPosition, setIssPosition] = useState<IssPosition | null>(null);
  const [eonetEvents, setEonetEvents] = useState<EonetEvent[]>([]);
  const [countries, setCountries] = useState({ features: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Countries GeoJSON
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(setCountries)
      .catch(console.error);

    // 2. Fetch ISS Position (Real-time)
    const fetchIss = async () => {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const data = await res.json();
        if (data.latitude) setIssPosition(data);
      } catch (err) { }
    };
    fetchIss();
    const issInterval = setInterval(fetchIss, 5000);

    // 3. Fetch Real Earthquakes from USGS
    const fetchEarthquakes = async () => {
      try {
        const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
        const data = await res.json();
        const quakes = data.features.map((f: any) => ({
          id: f.id,
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          magnitude: f.properties.mag,
          place: f.properties.place,
          timestamp: makeFakeTimestamp()
        }));
        setEarthquakes(quakes);
      } catch (err) { }
    };
    fetchEarthquakes();
    const quakeInterval = setInterval(fetchEarthquakes, 60000);

    // 4. Generate Beautiful Dummy Maps Data
    
    // Generate 50 Active Wildfires/Incidents
    const mockIncidents = Array.from({ length: 50 }).map((_, i) => ({
      id: `incident-${i}`,
      latitude: randomLat(),
      longitude: randomLon(),
      brightness: 300 + Math.random() * 80,
      confidence: 'h',
      frp: Math.random() * 50,
      timestamp: makeFakeTimestamp()
    }));
    setIncidents(mockIncidents);

    // Generate 100 Initial Flights
    let currentFlights = Array.from({ length: 150 }).map((_, i) => ({
      id: `flight-${i}`,
      latitude: randomLat(),
      longitude: randomLon(),
      direction: Math.random() * 360,
      flight_iata: `FL${Math.floor(Math.random() * 1000)}`,
      airline_name: 'Global Airlines',
      dep_iata: 'ORG',
      arr_iata: 'DST',
      timestamp: makeFakeTimestamp()
    }));
    setFlights(currentFlights);

    // Generate 100 Initial Ships
    let currentShips = Array.from({ length: 150 }).map((_, i) => ({
      id: `ship-${i}`,
      latitude: randomLat(),
      longitude: randomLon(),
      heading: Math.random() * 360,
      timestamp: makeFakeTimestamp()
    }));
    setShips(currentShips);

    // Generate Weather
    setWeather(Array.from({ length: 30 }).map((_, i) => ({
      id: `weather-${i}`,
      latitude: randomLat(),
      longitude: randomLon(),
      temperature: -10 + Math.random() * 45,
      windspeed: Math.random() * 30,
      timestamp: makeFakeTimestamp()
    })));

    // Generate News
    setNews([
      { id: '1', title: 'Global Markets Rally as Tech Sector Surges', source: 'Financial Times', link: '#', timestamp: makeFakeTimestamp(), country: ['Global'] },
      { id: '2', title: 'New Climate Accords Reached in Geneva', source: 'Reuters', link: '#', timestamp: makeFakeTimestamp(), country: ['Switzerland'] },
      { id: '3', title: 'Breakthrough in Renewable Energy Output', source: 'Science Daily', link: '#', timestamp: makeFakeTimestamp(), country: ['Global'] },
    ]);

    setLoading(false);

    // 5. Animate Dummy Data (Make ships and flights move slightly)
    const animInterval = setInterval(() => {
      currentFlights = currentFlights.map(f => {
        const rad = (f.direction * Math.PI) / 180;
        return {
          ...f,
          latitude: Math.max(-80, Math.min(80, f.latitude + Math.cos(rad) * 0.5)),
          longitude: f.longitude + Math.sin(rad) * 0.5
        };
      });
      setFlights(currentFlights);

      currentShips = currentShips.map(s => {
        const rad = (s.heading * Math.PI) / 180;
        return {
          ...s,
          latitude: Math.max(-80, Math.min(80, s.latitude + Math.cos(rad) * 0.05)),
          longitude: s.longitude + Math.sin(rad) * 0.05
        };
      });
      setShips(currentShips);
    }, 1000);

    return () => {
      clearInterval(issInterval);
      clearInterval(quakeInterval);
      clearInterval(animInterval);
    };
  }, []);

  return {
    incidents,
    flights,
    earthquakes,
    ships,
    weather,
    news,
    issPosition,
    eonetEvents,
    countries,
    loading
  };
}
