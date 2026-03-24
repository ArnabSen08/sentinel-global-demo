
"use client";

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Incident, EonetEvent } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HudHeader } from './hud-header';
import { useLiveData } from '@/hooks/use-live-data';
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
  const {
    incidents,
    flights,
    earthquakes,
    ships,
    weather,
    news,
    issPosition,
    eonetEvents,
    countries,
    loading
  } = useLiveData();

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
              stocks={[]}
          />
        </div>
      </main>
    </div>
  );
}
