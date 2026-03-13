"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident, Flight } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HudHeader } from './hud-header';
import { useToast } from "@/hooks/use-toast";
import { SituationalAwarenessSidebar } from './situational-awareness-sidebar';

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
  
  const [openWeatherMapApiKey, setOpenWeatherMapApiKey] = useState<string | undefined>();

  const [affectedRailIds, setAffectedRailIds] = useState<Set<string>>(new Set());
  const [affectedPowerIds, setAffectedPowerIds] = useState<Set<string>>(new Set());

  // New state for sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

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
        description: errorMessage.includes('access restricted') 
          ? "HTTPS is not available on your AviationStack plan. This is a known limitation of the free tier."
          : errorMessage,
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
    
    // Set OpenWeatherMap API key
    const owmKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
    if (owmKey && owmKey !== 'REPLACE_WITH_YOUR_OPENWEATHERMAP_API_KEY') {
        setOpenWeatherMapApiKey(owmKey);
    } else {
        console.warn("OpenWeatherMap API key is not configured. Weather layers will be unavailable.");
    }

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

  const handleIncidentSelect = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsSidebarOpen(true);
  };
  
  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Memoize nearby infrastructure for the selected incident
  const { nearbyPowerPlants, nearbyRailwaysCount } = useMemo(() => {
    if (!selectedIncident) return { nearbyPowerPlants: [], nearbyRailwaysCount: 0 };
    
    const incidentPoint = turfPoint([selectedIncident.longitude, selectedIncident.latitude]);
    const powerPlantsNearby: string[] = [];
    let railwaysNearbyCount = 0;

    for (const power of powerPlants.features) {
      if (!power.id || !power.geometry || !power.properties?.name) continue;
      const distance = turfDistance(incidentPoint, power.geometry, { units: 'kilometers' });
      if (distance < 5) {
        powerPlantsNearby.push(power.properties.name);
      }
    }
    
    for (const rail of railways.features) {
      if (!rail.id || !rail.geometry) continue;
      const distance = pointToLineDistance(incidentPoint, rail.geometry, { units: 'kilometers' });
      if (distance < 5) {
        railwaysNearbyCount++;
      }
    }
    
    return { nearbyPowerPlants: powerPlantsNearby, nearbyRailwaysCount: railwaysNearbyCount };
  }, [selectedIncident]);


  const latestTwentyIncidents = incidents.slice(0, 20);

  return (
    <div className="h-screen w-screen flex flex-col bg-black">
      <HudHeader 
        incidents={latestTwentyIncidents} 
        onRefreshFlights={fetchFlights} 
        isFetchingFlights={isFetchingFlights}
        onToggleSidebar={handleSidebarToggle}
      />
      <main className="flex-1 relative">
        <MapView 
            incidents={incidents} 
            flights={flights}
            powerPlants={powerPlants}
            railways={railways}
            affectedPowerIds={affectedPowerIds}
            affectedRailIds={affectedRailIds}
            openWeatherMapApiKey={openWeatherMapApiKey}
            onIncidentSelect={handleIncidentSelect}
            selectedIncidentId={selectedIncident?.id || null}
        />
        <SituationalAwarenessSidebar 
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
          incident={selectedIncident}
          nearbyPowerPlants={nearbyPowerPlants}
          nearbyRailwaysCount={nearbyRailwaysCount}
        />
      </main>
    </div>
  );
}
