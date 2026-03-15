
import type { Timestamp } from 'firebase/firestore';

export interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Timestamp;
  brightness?: number;
  frp?: number; // fire radiative power
  confidence?: string | number;
}

export interface Flight {
    id: string;
    latitude: number;
    longitude: number;
    direction: number;
    timestamp: Timestamp;
    flight_iata: string | null;
    airline_name: string;
    dep_iata: string;
    arr_iata: string;
}

export interface Earthquake {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Timestamp;
  magnitude: number;
  place: string;
}

export interface EonetEvent {
  id:string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  timestamp: Timestamp;
}

export interface Ship {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Timestamp;
  heading: number;
}

export interface IssPosition {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
}

export interface StockUpdate {
    id: string; // Ticker symbol
    price: number;
    change: number;
    timestamp: Timestamp;
}

export interface WeatherUpdate {
  id: string; // City name
  latitude: number;
  longitude: number;
  temperature: number;
  windspeed: number;
  timestamp: Timestamp;
}
