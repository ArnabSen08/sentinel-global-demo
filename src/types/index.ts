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
