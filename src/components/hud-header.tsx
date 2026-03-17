
"use client";

import type { Incident, NewsArticle } from '@/types';
import { Clock } from './clock';
import { Ticker } from './ticker';
import { Button } from './ui/button';
import { Globe, Map } from 'lucide-react';

interface HudHeaderProps {
  incidents: Incident[];
  news: NewsArticle[];
  viewMode: '2d' | '3d';
  toggleViewMode: () => void;
}

export function HudHeader({ incidents, news, viewMode, toggleViewMode }: HudHeaderProps) {
  return (
    <header className="relative z-10 flex h-16 w-full flex-shrink-0 flex-col justify-center border-b border-primary/20 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-xl font-bold tracking-widest text-primary/90 animate-pulse-glow">
          SENTINEL | GLOBAL
        </h1>
        <div className="flex items-center gap-4">
           <Button variant="outline" size="sm" onClick={toggleViewMode}>
              {viewMode === '2d' ? <Globe className="mr-2 h-4 w-4" /> : <Map className="mr-2 h-4 w-4" />}
              {viewMode === '2d' ? '3D View' : '2D View'}
           </Button>
          <Clock />
        </div>
      </div>
      <div className="absolute bottom-0 h-6 w-full overflow-hidden border-t border-primary/20">
        <Ticker incidents={incidents} news={news} />
      </div>
    </header>
  );
}
