"use client";

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident, Flight } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HudHeader } from './hud-header';
import { useToast } from "@/hooks/use-toast"


import type { FeatureCollection, Point, LineString } from 'geojson';
import { point as turfPoint } from '@turf/helpers';
import turfDistance from '@turf/distance';
import pointToLineDistance from '@turf/point-to-line-distance';
import { sub, isAfter } from 'date-fns';

import powerPlantsData from '@/data/ukraine-power-plants.geojson';
import railwaysData from '@/data/ukraine-railways.geojson';


const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 z-0 bg-background" />,
});

const powerPlants = powerPlantsData as FeatureCollection<Point, {name: string, type: string}>;
const railways = railwaysData as FeatureCollection<LineString, {name: string}>;

const UKRAINE_BOUNDS = {
  lat: { min: 44.3, max: 52.4 },
  lon: { min: 22.1, max: 40.2 },
};

export default function SentinelDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingFlights, setIsFetchingFlights] = useState(false);
  const { toast } = useToast();

  const [affectedRailIds, setAffectedRailIds] = useState<Set<string>>(new Set());
  const [affectedPowerIds, setAffectedPowerIds] = useState<Set<string>>(new Set());

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
      // API docs: https://aviationstack.com/documentation
      const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_status=active`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || `Aviationstack API request failed with status: ${response.status}`);
      }
      const data = await response.json();
      
      const ukraineFlights = data.data
        .filter((flight: any) => flight.live &&
            flight.live.latitude >= UKRAINE_BOUNDS.lat.min &&
            flight.live.latitude <= UKRAINE_BOUNDS.lat.max &&
            flight.live.longitude >= UKRAINE_BOUNDS.lon.min &&
            flight.live.longitude <= UKRAINE_BOUNDS.lon.max
        )
        .map((flight: any): Flight => ({
          id: flight.flight.iata,
          latitude: flight.live.latitude,
          longitude: flight.live.longitude,
          direction: flight.live.direction,
          flight_iata: flight.flight.iata,
          airline_name: flight.airline.name,
          dep_iata: flight.departure.iata,
          arr_iata: flight.arrival.iata,
        }));
      
      setFlights(ukraineFlights);
      toast({
        title: "Flights Updated",
        description: `Found ${ukraineFlights.length} active flights over Ukraine.`,
      });

    } catch (error) {
      console.error("Error fetching flight data:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Failed to Fetch Flights",
        description: errorMessage,
      });
    } finally {
      setIsFetchingFlights(false);
    }
  }, [toast]);


  useEffect(() => {
    const incidentsCollection = collection(firestore, 'incidents');
    const q = query(incidentsCollection, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newIncidents = snapshot.docs.map((doc: DocumentData) => ({
        id: doc.id,
        ...doc.data(),
      })) as Incident[];
      setIncidents(newIncidents);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching incidents:", error);
      setLoading(false);
    });

    // Fetch initial flight data on load
    fetchFlights();

    return () => unsubscribe();
  }, [fetchFlights]);

  useEffect(() => {
    if (!incidents.length) return;
    
    const newAffectedRailIds = new Set<string>();
    const newAffectedPowerIds = new Set<string>();

    const recentIncidents = incidents.filter(incident => 
      isAfter(incident.timestamp.toDate(), sub(new Date(), { hours: 24 }))
    );

    for (const incident of recentIncidents) {
      if (!incident.longitude || !incident.latitude) continue;

      const incidentPoint = turfPoint([incident.longitude, incident.latitude]);

      // Proximity check for railways
      for (const rail of railways.features) {
        if (!rail.id || !rail.geometry) continue;
        const distance = pointToLineDistance(incidentPoint, rail.geometry, { units: 'kilometers' });
        if (distance < 5) {
          newAffectedRailIds.add(rail.id as string);
        }
      }

      // Proximity check for power plants
      for (const power of powerPlants.features) {
        if (!power.id || !power.geometry) continue;
        const distance = turfDistance(incidentPoint, power.geometry, { units: 'kilometers' });
        if (distance < 5) {
          newAffectedPowerIds.add(power.id as string);
        }
      }
    }

    setAffectedRailIds(newAffectedRailIds);
    setAffectedPowerIds(newAffectedPowerIds);

  }, [incidents]);


  const latestTwentyIncidents = incidents.slice(0, 20);

  return (
    <div className="h-screen w-screen flex flex-col bg-black">
      <HudHeader incidents={latestTwentyIncidents} onRefreshFlights={fetchFlights} isFetchingFlights={isFetchingFlights} />
      <main className="flex-1 relative">
        <MapView 
            incidents={incidents} 
            flights={flights}
            powerPlants={powerPlants}
            railways={railways}
            affectedPowerIds={affectedPowerIds}
            affectedRailIds={affectedRailIds}
        />
      </main>
    </div>
  );
}
