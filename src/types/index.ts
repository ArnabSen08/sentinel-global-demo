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
    flight_iata: string;
    airline_name: string;
    dep_iata: string;
    arr_iata: string;
}
