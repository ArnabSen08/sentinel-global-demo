"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div className="flex gap-4 text-sm font-medium text-primary/80">
        <span>UTC: --:--:--</span>
        <span>KYIV: --:--:--</span>
      </div>
    );
  }

  const utcTime = format(time, 'HH:mm:ss');
  const kyivTime = format(utcToZonedTime(time, 'Europe/Kyiv'), 'HH:mm:ss');

  return (
    <div className="flex gap-4 text-sm font-medium text-primary/80">
      <span>UTC: {utcTime}</span>
      <span>KYIV: {kyivTime}</span>
    </div>
  );
}
