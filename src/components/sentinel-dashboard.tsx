
"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident, Flight, Earthquake, EonetEvent, Ship, WeatherUpdate } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HudHeader } from './hud-header';
import { useToast } from "@/hooks/use-toast";

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 z-0 bg-background" />,
});

export default function SentinelDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [eonetEvents, setEonetEvents] = useState<EonetEvent[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [weather, setWeather] = useState<WeatherUpdate[]>([]);

  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const subscribers: (() => void)[] = [];

    const setupListener = (collectionName: string, setter: React.Dispatch<any>, orderField: string | null = 'timestamp') => {
        const coll = collection(firestore, collectionName);
        const q = orderField 
            ? query(coll, orderBy(orderField, 'desc'), limit(1000))
            : query(coll, limit(1000));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() }));
            setter(data);
            setLoading(false); // Stop loading after first data comes in
        }, (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
            toast({
                variant: 'destructive',
                title: `Failed to load ${collectionName}`,
                description: error.message
            })
            setLoading(false);
        });
        subscribers.push(unsubscribe);
    };

    setupListener('incidents', setIncidents);
    setupListener('earthquakes', setEarthquakes);
    setupListener('eonet_events', setEonetEvents);
    setupListener('ships', setShips);
    setupListener('flights', setFlights);
    setupListener('weather', setWeather, null);
    
    return () => {
      subscribers.forEach(unsub => unsub());
    };
  }, [toast]);

  const latestTwentyIncidents = incidents.slice(0, 20);

  return (
    <div className="h-screen w-screen flex flex-col bg-black">
      <HudHeader 
        incidents={latestTwentyIncidents} 
      />
      <main className="flex-1 relative">
        <MapView 
            incidents={incidents} 
            flights={flights}
            earthquakes={earthquakes}
            eonetEvents={eonetEvents}
            ships={ships}
            weather={weather}
        />
      </main>
    </div>
  );
}
