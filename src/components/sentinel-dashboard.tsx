
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
    <div className="min-h-screen w-full flex flex-col bg-black">
      <HudHeader 
        incidents={latestTwentyIncidents}
        news={latestTwentyNews}
      />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8">
        
        {/* Globe Section */}
        <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight text-primary">Global Overview</h2>
                   <p className="text-muted-foreground text-sm">3D interactive visualization of current active events.</p>
                </div>
            </div>
            <div className="w-full h-[600px] md:h-[700px] rounded-xl border border-primary/20 bg-black/50 overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)] shadow-primary/5">
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
        </section>

        {/* Flat Map Section */}
        <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight text-primary">Tactical Map</h2>
                   <p className="text-muted-foreground text-sm">Detailed 2D topographical view of incidents and traffic.</p>
                </div>
            </div>
            <div className="w-full h-[600px] md:h-[700px] rounded-xl border border-primary/20 bg-black/50 overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)] shadow-primary/5">
                <MapView 
                    incidents={incidents} 
                    flights={flights}
                    earthquakes={earthquakes}
                    eonetEvents={eonetEvents}
                    ships={ships}
                    weather={weather}
                />
            </div>
        </section>

        {/* Data & Intelligence Section */}
         <section className="flex flex-col gap-4 mb-20">
            <div className="flex justify-between items-end">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight text-primary">Intelligence Hub</h2>
                   <p className="text-muted-foreground text-sm">AI Analyst and raw data feeds.</p>
                </div>
            </div>
            <div className="w-full h-[800px] rounded-xl border border-primary/20 bg-black/70 backdrop-blur-md overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)] shadow-primary/5">
                <DataSidebar 
                    incidents={incidents}
                    earthquakes={earthquakes}
                    news={news}
                    ships={ships}
                    flights={flights}
                    stocks={[]}
                />
            </div>
        </section>

      </main>
    </div>
  );
}
