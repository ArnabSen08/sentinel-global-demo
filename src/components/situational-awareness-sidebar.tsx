"use client";

import { useState, useEffect } from 'react';
import type { Incident } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bot, Zap, Train, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { analyzeIncident, type AnalyzeIncidentInput } from '@/ai/flows/analyze-incident-flow';
import { useToast } from "@/hooks/use-toast";


interface SituationalAwarenessSidebarProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  incident: Incident | null;
  nearbyPowerPlants: string[];
  nearbyRailwaysCount: number;
}

export function SituationalAwarenessSidebar({
  isOpen,
  onOpenChange,
  incident,
  nearbyPowerPlants,
  nearbyRailwaysCount,
}: SituationalAwarenessSidebarProps) {

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateBrief = async () => {
    if (!incident) return;
    setIsLoading(true);
    setAnalysis(null);
    try {
      const input: AnalyzeIncidentInput = {
        incident: {
          lat: incident.latitude,
          lon: incident.longitude,
          frp: incident.frp,
          time: incident.timestamp.toDate().toISOString(),
        },
        nearbyInfrastructure: {
          powerPlants: nearbyPowerPlants,
          railways: nearbyRailwaysCount,
        }
      };
      const result = await analyzeIncident(input);
      setAnalysis(result);
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: "Could not generate the intelligence briefing.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Reset analysis when the incident changes or sidebar closes
    if (!isOpen || !incident) {
      setAnalysis(null);
    }
  }, [incident, isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-card/80 backdrop-blur-lg border-primary/20 text-foreground p-0">
        {incident ? (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b border-primary/20">
              <SheetTitle className="text-primary text-xl">Intel Briefing: Anomaly Detected</SheetTitle>
              <SheetDescription>
                {format(incident.timestamp.toDate(), "yyyy-MM-dd HH:mm:ss 'UTC'")}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <Card className="bg-background/50 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground/90">Incident Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Coordinates:</strong> {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}</p>
                  <p><strong>Intensity (FRP):</strong> {incident.frp ?? 'N/A'} MW</p>
                  <p><strong>Brightness:</strong> {incident.brightness ?? 'N/A'} K</p>
                  <p><strong>Confidence:</strong> {incident.confidence ?? 'N/A'}</p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground/90">Infrastructure Proximity (5km)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  {nearbyPowerPlants.length > 0 ? (
                    <div className="flex items-start gap-2 text-amber-400">
                      <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Power Plants:</strong>
                        <ul className="list-disc pl-5">
                          {nearbyPowerPlants.map(name => <li key={name}>{name}</li>)}
                        </ul>
                      </div>
                    </div>
                  ) : (
                     <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4 flex-shrink-0" />
                      <span>No power plants nearby.</span>
                    </div>
                  )}
                  {nearbyRailwaysCount > 0 ? (
                     <div className="flex items-start gap-2 text-sky-400">
                      <Train className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{nearbyRailwaysCount} railway line(s) nearby.</span>
                    </div>
                  ) : (
                     <div className="flex items-center gap-2 text-muted-foreground">
                      <Train className="h-4 w-4 flex-shrink-0" />
                      <span>No railways nearby.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator className="bg-border" />

              <div className="space-y-3">
                 <Button onClick={handleGenerateBrief} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2 h-4 w-4" />
                  )}
                  Generate AI Intel Brief
                </Button>
                {isLoading && (
                   <p className="text-sm text-center text-muted-foreground animate-pulse">SENTINEL is analyzing...</p>
                )}
                {analysis && (
                  <Card className="bg-background/50 border-primary/30">
                    <CardHeader>
                       <CardTitle className="text-lg text-primary flex items-center gap-2">
                        <Bot size={20} /> SENTINEL Analysis
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{analysis}</CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12" />
              <p className="mt-4">No Incident Selected</p>
              <p className="text-xs">Click an anomaly on the map to view details.</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
