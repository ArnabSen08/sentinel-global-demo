"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HudHeader } from './hud-header';

import type { FeatureCollection, Point, LineString } from 'geojson';
import { point as turfPoint } from '@turf/helpers';
import turfDistance from '@turf/distance';
import pointToLineDistance from '@turf/point-to-line-distance';
import { sub, isAfter } from 'date-fns';

import powerPlantsData from '@/data/ukraine-power-plants.geojson';
import railwaysData from '@/data/ukraine-railways.geojson';
import ukraineBoundaryData from '@/data/ukraine-boundary.geojson';


const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 z-0 bg-background" />,
});

const powerPlants = powerPlantsData as FeatureCollection<Point, {name: string, type: string}>;
const railways = railwaysData as FeatureCollection<LineString, {name: string}>;
const ukraineBoundary = ukraineBoundaryData as FeatureCollection;

export default function SentinelDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const [affectedRailIds, setAffectedRailIds] = useState<Set<string>>(new Set());
  const [affectedPowerIds, setAffectedPowerIds] = useState<Set<string>>(new Set());


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

    return () => unsubscribe();
  }, []);

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
      <HudHeader incidents={latestTwentyIncidents} />
      <main className="flex-1 relative">
        <MapView 
            incidents={incidents} 
            powerPlants={powerPlants}
            railways={railways}
            ukraineBoundary={ukraineBoundary}
            affectedPowerIds={affectedPowerIds}
            affectedRailIds={affectedRailIds}
        />
      </main>
    </div>
  );
}
