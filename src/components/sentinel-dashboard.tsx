"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { collection, onSnapshot, query, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';
import type { Incident } from '@/types';
import { IncidentList } from '@/components/incident-list';
import { ControlPanel } from '@/components/control-panel';
import { Skeleton } from '@/components/ui/skeleton';

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 z-0 bg-card" />,
});

export default function SentinelDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const incidentsCollection = collection(firestore, 'incidents');
    const q = query(incidentsCollection, orderBy('timestamp', 'desc'), limit(500)); // Limit to last 500 for performance

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

  const latestFiveIncidents = incidents.slice(0, 5);

  return (
    <>
      <MapView incidents={incidents} />
      <IncidentList incidents={latestFiveIncidents} loading={loading} />
      <ControlPanel />
    </>
  );
}
