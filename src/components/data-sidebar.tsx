"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Incident, Earthquake, NewsArticle, Ship, Flight } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { SidebarHeader, SidebarSeparator } from "./ui/sidebar";
import { cn } from "@/lib/utils";

interface DataSidebarProps {
  incidents: Incident[];
  earthquakes: Earthquake[];
  news: NewsArticle[];
  ships: Ship[];
  flights: Flight[];
}

function DataTable({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <ScrollArea className={cn("h-[calc(100vh-10rem)]", className)}>
            <Table>
                {children}
            </Table>
        </ScrollArea>
    )
}

export function DataSidebar({ incidents, earthquakes, news, ships, flights }: DataSidebarProps) {
  return (
    <div className="h-full w-full flex flex-col">
        <SidebarHeader className="p-4">
             <h2 className="text-lg font-semibold text-primary">Live Data Feeds</h2>
             <p className="text-xs text-muted-foreground">Real-time event streams from global sources.</p>
        </SidebarHeader>
        <SidebarSeparator />
        <Tabs defaultValue="incidents" className="flex-1 p-4 flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="incidents">Fires</TabsTrigger>
                <TabsTrigger value="earthquakes">Quakes</TabsTrigger>
                <TabsTrigger value="news">News</TabsTrigger>
                <TabsTrigger value="ships">Ships</TabsTrigger>
                <TabsTrigger value="flights">Flights</TabsTrigger>
            </TabsList>
            <TabsContent value="incidents" className="flex-1 mt-4">
                <DataTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>FRP</TableHead>
                            <TableHead className="text-right">Coords</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {incidents.slice(0,100).map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{formatDistanceToNow(item.timestamp.toDate())}</TableCell>
                                <TableCell>{item.frp || 'N/A'}</TableCell>
                                <TableCell className="text-right text-xs">{item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </DataTable>
            </TabsContent>
            <TabsContent value="earthquakes" className="flex-1 mt-4">
                 <DataTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Mag</TableHead>
                            <TableHead className="text-right">Place</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {earthquakes.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{formatDistanceToNow(item.timestamp.toDate())}</TableCell>
                                <TableCell>{item.magnitude.toFixed(1)}</TableCell>
                                <TableCell className="text-right">{item.place}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </DataTable>
            </TabsContent>
            <TabsContent value="news" className="flex-1 mt-4">
                <DataTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Title</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {news.slice(0, 100).map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{formatDistanceToNow(item.timestamp.toDate())}</TableCell>
                                <TableCell>
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                        {item.title}
                                    </a>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </DataTable>
            </TabsContent>
            <TabsContent value="ships" className="flex-1 mt-4">
                 <DataTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Coords</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ships.slice(0,200).map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs">{formatDistanceToNow(item.timestamp.toDate())}</TableCell>
                                <TableCell className="text-right text-xs">{item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </DataTable>
            </TabsContent>
            <TabsContent value="flights" className="flex-1 mt-4">
                 <DataTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Flight</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {flights.slice(0,100).map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.flight_iata || 'N/A'}</TableCell>
                                <TableCell>{item.dep_iata} &rarr; {item.arr_iata}</TableCell>
                                <TableCell className="text-right text-xs">{formatDistanceToNow(item.timestamp.toDate())}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </DataTable>
            </TabsContent>
        </Tabs>
    </div>
  );
}
