"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns-tz';

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
        <span>IST: --:--:--</span>
      </div>
    );
  }

  const utcTime = format(time, 'HH:mm:ss', { timeZone: 'UTC' });
  const istTime = format(time, 'HH:mm:ss', { timeZone: 'Asia/Kolkata' });

  return (
    <div className="flex gap-4 text-sm font-medium text-primary/80">
      <span>UTC: {utcTime}</span>
      <span>IST: {istTime}</span>
    </div>
  );
}
