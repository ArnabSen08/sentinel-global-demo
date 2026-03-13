import type { Incident } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Flame } from 'lucide-react';

interface TickerProps {
  incidents: Incident[];
}

export function Ticker({ incidents }: TickerProps) {
  if (incidents.length === 0) {
    return (
      <div className="flex h-full items-center bg-black/50 px-4 text-xs text-muted-foreground">
        Awaiting incident data...
      </div>
    );
  }

  const tickerContent = incidents.map(incident => (
    <span key={incident.id} className="mr-8 flex items-center">
      <Flame className="mr-2 h-3 w-3 text-destructive" />
      <span className="text-destructive/80">THERMAL ANOMALY:</span>
      <span className="ml-2 text-foreground/80">
        LAT {incident.latitude.toFixed(2)}, LON {incident.longitude.toFixed(2)}
      </span>
      <span className="ml-2 text-muted-foreground">
        ({formatDistanceToNow(incident.timestamp.toDate(), { addSuffix: true })})
      </span>
    </span>
  ));

  return (
    <div className="relative flex h-full w-full items-center bg-black/50">
      <div className="animate-ticker-item flex">
        {tickerContent}
        {/* Duplicate content for seamless looping */}
        {tickerContent} 
      </div>
    </div>
  );
}
