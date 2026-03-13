"use client";

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident, Flight, Earthquake, EonetEvent } from '@/types';
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

  const [loading, setLoading] = useState(true);
  const [isFetchingFlights, setIsFetchingFlights] = useState(false);
  const { toast } = useToast();
  
  const [openWeatherMapApiKey, setOpenWeatherMapApiKey] = useState<string | undefined>();

  const fetchFlights = useCallback(async () => {
    setIsFetchingFlights(true);
    const apiKey = process.env.NEXT_PUBLIC_AVIATIONSTACK_API_KEY;
    if (!apiKey) {
      console.error("Aviationstack API key is missing.");
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Aviationstack API key not found.",
      });
      setIsFetchingFlights(false);
      return;
    }

    try {
      // Attempting to use HTTPS. Note: AviationStack's free plan may not support HTTPS.
      // If this fails, it's likely a limitation of the free plan blocking HTTPS access.
      const url = `https://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_status=active`;
      const response = await fetch(url);
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || `Aviationstack API request failed with status: ${response.status}`);
      }
      
      const allFlights = data.data
        .filter((flight: any) => flight.live) // Only show flights with live data
        .map((flight: any): Flight => ({
          id: flight.flight.iata || `${flight.departure.iata}-${flight.arrival.iata}-${flight.airline.iata}`,
          latitude: flight.live.latitude,
          longitude: flight.live.longitude,
          direction: flight.live.direction,
          flight_iata: flight.flight.iata,
          airline_name: flight.airline.name,
          dep_iata: flight.departure.iata,
          arr_iata: flight.arrival.iata,
        }));
      
      setFlights(allFlights);
      toast({
        title: "Flights Updated",
        description: `Found ${allFlights.length} active flights.`,
      });

    } catch (error) {
      console.error("Error fetching flight data:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Failed to Fetch Flights",
        description: errorMessage.includes('access restricted') 
          ? "HTTPS is not available on your AviationStack plan. This is a known limitation of the free tier."
          : errorMessage,
      });
    } finally {
      setIsFetchingFlights(false);
    }
  }, [toast]);


  useEffect(() => {
    // Listener for Fires
    const incidentsCollection = collection(firestore, 'incidents');
    const qFires = query(incidentsCollection, orderBy('timestamp', 'desc'), limit(500));
    const unsubscribeFires = onSnapshot(qFires, (snapshot) => {
      const newIncidents = snapshot.docs.map((doc: DocumentData) => ({
        id: doc.id, ...doc.data(),
      })) as Incident[];
      setIncidents(newIncidents);
      setLoading(false); // Set loading false on first data arrival
    }, (error) => {
      console.error("Error fetching incidents:", error);
      setLoading(false);
    });

    // Listener for Earthquakes
    const earthquakesCollection = collection(firestore, 'earthquakes');
    const qQuakes = query(earthquakesCollection, orderBy('timestamp', 'desc'), limit(200));
    const unsubscribeQuakes = onSnapshot(qQuakes, (snapshot) => {
      const newEarthquakes = snapshot.docs.map((doc: DocumentData) => ({
        id: doc.id, ...doc.data(),
      })) as Earthquake[];
      setEarthquakes(newEarthquakes);
    }, (error) => {
      console.error("Error fetching earthquakes:", error);
    });

    // Listener for EONET Events
    const eonetCollection = collection(firestore, 'eonet_events');
    const qEonet = query(eonetCollection, orderBy('timestamp', 'desc'), limit(200));
    const unsubscribeEonet = onSnapshot(qEonet, (snapshot) => {
      const newEonetEvents = snapshot.docs.map((doc: DocumentData) => ({
        id: doc.id, ...doc.data(),
      })) as EonetEvent[];
      setEonetEvents(newEonetEvents);
    }, (error) => {
      console.error("Error fetching EONET events:", error);
    });


    // Fetch initial flight data on load
    fetchFlights();
    
    // Set OpenWeatherMap API key
    const owmKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
    if (owmKey && owmKey !== 'REPLACE_WITH_YOUR_OPENWEATHERMAP_API_KEY') {
        setOpenWeatherMapApiKey(owmKey);
    } else {
        console.warn("OpenWeatherMap API key is not configured. Weather layers will be unavailable.");
    }

    return () => {
      unsubscribeFires();
      unsubscribeQuakes();
      unsubscribeEonet();
    };
  }, [fetchFlights]);

  const latestTwentyIncidents = incidents.slice(0, 20);

  return (
    <div className="h-screen w-screen flex flex-col bg-black">
      <HudHeader 
        incidents={latestTwentyIncidents} 
        onRefreshFlights={fetchFlights} 
        isFetchingFlights={isFetchingFlights}
      />
      <main className="flex-1 relative">
        <MapView 
            incidents={incidents} 
            flights={flights}
            earthquakes={earthquakes}
            eonetEvents={eonetEvents}
            openWeatherMapApiKey={openWeatherMapApiKey}
        />
      </main>
    </div>
  );
}
