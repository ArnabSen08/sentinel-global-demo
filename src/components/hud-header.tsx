"use client";

import type { Incident, NewsArticle } from '@/types';
import { Clock } from './clock';
import { Ticker } from './ticker';

interface HudHeaderProps {
  incidents: Incident[];
  news: NewsArticle[];
}

export function HudHeader({ incidents, news }: HudHeaderProps) {
  return (
    <header className="relative z-10 flex h-16 w-full flex-shrink-0 flex-col justify-center border-b border-primary/20 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-xl font-bold tracking-widest text-primary/90 animate-pulse-glow">
          SENTINEL | GLOBAL
        </h1>
        <div className="flex items-center gap-4">
          <Clock />
        </div>
      </div>
      <div className="absolute bottom-0 h-6 w-full overflow-hidden border-t border-primary/20">
        <Ticker incidents={incidents} news={news} />
      </div>
    </header>
  );
}
