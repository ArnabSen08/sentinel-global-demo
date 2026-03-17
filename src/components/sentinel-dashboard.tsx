
"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident, Flight, Earthquake, EonetEvent, Ship, WeatherUpdate, NewsArticle, IssPosition, StockUpdate } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HudHeader } from './hud-header';
import { useToast } from "@/hooks/use-toast";
import { DataSidebar } from './data-sidebar';

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 z-0 bg-background" />,
});

const GlobeView = dynamic(() => import('@/components/globe-view'), {
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
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [stocks, setStocks] = useState<StockUpdate[]>([]);
  const [issPosition, setIssPosition] = useState<IssPosition | null>(null);
  const [countries, setCountries] = useState({ features: [] });

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
    setupListener('news', setNews);
    setupListener('stocks', setStocks);

    async function fetchIssPosition() {
        try {
            const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
            if (response.ok) {
                const data = await response.json();
                setIssPosition(data as IssPosition);
            }
        } catch (error) {
            console.error("Error fetching ISS position:", error);
        }
    }

    fetchIssPosition();
    const issInterval = setInterval(fetchIssPosition, 5000);

    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(setCountries)
        .catch(err => {
            console.error("Error fetching country data:", err);
            toast({ variant: 'destructive', title: 'Could not load country borders.' });
        });
    
    return () => {
      subscribers.forEach(unsub => unsub());
      clearInterval(issInterval);
    };
  }, [toast]);

  const allIncidents = useMemo(() => [...incidents, ...eonetEvents], [incidents, eonetEvents]);
  const latestTwentyIncidents = incidents.slice(0, 20);
  const latestTwentyNews = news.slice(0, 20);

  return (
    <div className="h-screen w-screen flex flex-col bg-black">
      <HudHeader 
        incidents={latestTwentyIncidents}
        news={latestTwentyNews}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-[3] flex flex-col relative">
           <div className="flex-1 relative border-b border-primary/20">
             <GlobeView
                  allIncidents={allIncidents}
                  earthquakes={earthquakes}
                  ships={ships}
                  flights={flights}
                  countries={countries}
                  issPosition={issPosition}
                  weather={weather}
              />
           </div>
           <div className="flex-1 relative">
             <MapView 
                  incidents={incidents} 
                  flights={flights}
                  earthquakes={earthquakes}
                  eonetEvents={eonetEvents}
                  ships={ships}
                  weather={weather}
              />
           </div>
        </div>
        <div className="flex-[2] border-t border-primary/20 bg-black/70 backdrop-blur-sm overflow-hidden">
           <DataSidebar 
              incidents={incidents}
              earthquakes={earthquakes}
              news={news}
              ships={ships}
              flights={flights}
              stocks={stocks}
          />
        </div>
      </main>
    </div>
  );
}
