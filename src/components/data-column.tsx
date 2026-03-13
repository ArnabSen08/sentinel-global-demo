import React from 'react';

interface DataColumnProps {
  title: string;
  children: React.ReactNode;
}

export function DataColumn({ title, children }: DataColumnProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden border border-border bg-card/50 p-2">
      <h3 className="mb-2 flex-shrink-0 text-center font-bold text-primary">{title}</h3>
      <div className="min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
}
