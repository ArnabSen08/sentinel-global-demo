"use client";

import type { Incident } from '@/types';
import { Clock } from './clock';
import { Ticker } from './ticker';
import { Button } from './ui/button';
import { RefreshCw, PanelRightOpen } from 'lucide-react';

interface HudHeaderProps {
  incidents: Incident[];
  onRefreshFlights: () => void;
  isFetchingFlights: boolean;
  onToggleSidebar: () => void;
}

export function HudHeader({ incidents, onRefreshFlights, isFetchingFlights, onToggleSidebar }: HudHeaderProps) {
  return (
    <header className="relative z-10 flex h-16 w-full flex-shrink-0 flex-col justify-center border-b border-primary/20 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-xl font-bold tracking-widest text-primary/90 animate-pulse-glow">
          SENTINEL UKRAINE | LIVE
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefreshFlights} disabled={isFetchingFlights}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetchingFlights ? 'animate-spin' : ''}`} />
            Refresh Flights
          </Button>
          <Clock />
           <Button variant="outline" size="icon" onClick={onToggleSidebar} className="h-9 w-9">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="absolute bottom-0 h-6 w-full overflow-hidden border-t border-primary/20">
        <Ticker incidents={incidents} />
      </div>
    </header>
  );
}
