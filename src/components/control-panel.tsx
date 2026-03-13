"use client";

import { useState, useTransition } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateMockData, fetchAndStoreFirmsData } from '@/app/actions';
import { GlassCard } from '@/components/ui/glass-card';

export function ControlPanel() {
  const { toast } = useToast();
  const [isMockPending, startMockTransition] = useTransition();
  const [isFirmsPending, startFirmsTransition] = useTransition();

  const handleGenerateMock = () => {
    startMockTransition(async () => {
      const result = await generateMockData();
      toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    });
  };

  const handleFetchFirms = () => {
    startFirmsTransition(async () => {
      toast({
        title: 'Fetching FIRMS Data',
        description: 'Requesting latest thermal data from NASA. This may take a moment...',
      });
      const result = await fetchAndStoreFirmsData();
      toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    });
  };
  
  const isPending = isMockPending || isFirmsPending;

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <GlassCard className="p-3">
        <div className="flex items-center gap-2">
           <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateMock}
            disabled={isPending}
            className="bg-background/50 hover:bg-background/70 border-primary/50"
            >
             <Bot className={`mr-2 h-4 w-4 ${isMockPending ? 'animate-spin' : ''}`} />
             Gen Mock Data
           </Button>
           <Button
            variant="outline"
            size="sm"
            onClick={handleFetchFirms}
            disabled={isPending}
            className="bg-background/50 hover:bg-background/70 border-primary/50"
            >
             <RefreshCw className={`mr-2 h-4 w-4 ${isFirmsPending ? 'animate-spin' : ''}`} />
             Fetch FIRMS Data
           </Button>
        </div>
      </GlassCard>
    </div>
  );
}
