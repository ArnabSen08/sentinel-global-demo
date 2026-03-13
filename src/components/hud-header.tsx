"use client";

import type { Incident } from '@/types';
import { Clock } from './clock';
import { Ticker } from './ticker';

interface HudHeaderProps {
  incidents: Incident[];
}

export function HudHeader({ incidents }: HudHeaderProps) {
  return (
    <header className="relative z-10 flex h-16 w-full flex-shrink-0 flex-col justify-center border-b border-primary/20 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-xl font-bold tracking-widest text-primary/90" style={{ textShadow: '0 0 8px hsla(var(--primary), 0.5)'}}>
          SENTINEL UKRAINE | LIVE
        </h1>
        <Clock />
      </div>
      <div className="absolute bottom-0 h-6 w-full overflow-hidden border-t border-primary/20">
        <Ticker incidents={incidents} />
      </div>
    </header>
  );
}
