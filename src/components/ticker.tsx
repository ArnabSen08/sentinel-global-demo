import type { Incident, NewsArticle } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Flame, Newspaper } from 'lucide-react';

interface TickerProps {
  incidents: Incident[];
  news: NewsArticle[];
}

export function Ticker({ incidents, news }: TickerProps) {
  if (incidents.length === 0 && news.length === 0) {
    return (
      <div className="flex h-full items-center bg-black/50 px-4 text-xs text-muted-foreground">
        Awaiting data...
      </div>
    );
  }

  const incidentItems = incidents.map(incident => (
    <span key={`incident-${incident.id}`} className="mr-8 flex items-center">
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

  const newsItems = news.map(article => (
    <a 
      key={`news-${article.id}`} 
      href={article.link} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="mr-8 flex items-center hover:bg-primary/10"
    >
      <Newspaper className="mr-2 h-3 w-3 text-cyan-400" />
      <span className="text-cyan-400/80">NEWS:</span>
      <span className="ml-2 text-foreground/80 group-hover:underline">
        {article.title}
      </span>
      {article.country?.length > 0 && (
          <span className="ml-2 text-muted-foreground">
            ({article.country.join(', ').toUpperCase()})
          </span>
      )}
    </a>
  ));

  const tickerContent = [...incidentItems, ...newsItems];

  return (
    <div className="relative flex h-full w-full items-center bg-black/50 group">
      <div className="animate-ticker-item flex">
        {tickerContent}
        {/* Duplicate content for seamless looping */}
        {tickerContent} 
      </div>
    </div>
  );
}
