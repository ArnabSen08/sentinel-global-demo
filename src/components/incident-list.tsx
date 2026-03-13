"use client";

import { formatDistanceToNow } from 'date-fns';
import { GlassCard } from '@/components/ui/glass-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Incident } from '@/types';
import { Skeleton } from './ui/skeleton';

interface IncidentListProps {
  incidents: Incident[];
  loading: boolean;
}

export function IncidentList({ incidents, loading }: IncidentListProps) {
  return (
    <div className="absolute right-4 top-4 z-10 h-[calc(100%-2rem)] w-full max-w-sm">
        <GlassCard className="h-full flex flex-col">
            <h2 className="p-4 font-headline text-lg font-bold text-accent">Latest Incidents</h2>
            <Separator className="bg-white/10"/>
            <ScrollArea className="flex-1">
                <div className="p-4">
                {loading && (
                    <ul className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => <IncidentItemSkeleton key={i} />)}
                    </ul>
                )}
                {!loading && incidents.length === 0 && (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    No recent incidents detected.
                  </div>
                )}
                {!loading && incidents.length > 0 && (
                    <ul className="space-y-4">
                        {incidents.map((incident) => (
                            <li key={incident.id} className="text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-foreground">
                                        Thermal Anomaly
                                    </span>
                                    <span className="text-muted-foreground">
                                        {formatDistanceToNow(incident.timestamp.toDate(), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Lat: {incident.latitude.toFixed(4)}, Lon: {incident.longitude.toFixed(4)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
                </div>
            </ScrollArea>
        </GlassCard>
    </div>
  );
}

function IncidentItemSkeleton() {
    return (
        <div className="space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-3 w-3/5" />
        </div>
    );
}
