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
