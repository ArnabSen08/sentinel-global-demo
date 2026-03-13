import type { Incident } from '@/types';
import { DataColumn } from './data-column';
import { ScrollArea } from './ui/scroll-area';
import { isBefore, sub, formatDistanceToNow } from 'date-fns';

interface DataGridProps {
  incidents: Incident[];
}

export function DataGrid({ incidents }: DataGridProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 h-1/3 border-t border-primary/20 bg-black/50 p-2 backdrop-blur-sm">
      <div className="grid h-full grid-cols-4 gap-2">
        <DataColumn title="QUAKES">
           <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available</div>
        </DataColumn>
        <DataColumn title="FIRES">
            <ScrollArea className="h-full pr-3">
                <ul className="space-y-2 text-xs">
                    {incidents.map(incident => {
                        const isOld = isBefore(incident.timestamp.toDate(), sub(new Date(), { hours: 24 }));
                        return (
                            <li 
                                key={incident.id} 
                                className={`flex justify-between ${isOld ? 'text-muted-foreground/50' : 'text-foreground/90'}`}
                            >
                                <span>
                                    {incident.latitude.toFixed(3)}, {incident.longitude.toFixed(3)}
                                </span>
                                <span className={isOld ? 'text-muted-foreground/50' : 'text-muted-foreground'}>
                                  {formatDistanceToNow(incident.timestamp.toDate(), { addSuffix: true})}
                                </span>
                            </li>
                        );
                    })}
                     {incidents.length === 0 && <div className="text-sm text-muted-foreground text-center pt-4">No recent fire incidents</div>}
                </ul>
            </ScrollArea>
        </DataColumn>
        <DataColumn title="ALERTS">
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available</div>
        </DataColumn>
        <DataColumn title="INFRASTRUCTURE">
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available</div>
        </DataColumn>
      </div>
    </div>
  );
}
