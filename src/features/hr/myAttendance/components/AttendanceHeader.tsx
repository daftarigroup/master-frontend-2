'use client';

import type React from 'react';

export interface AttendanceHeaderProps {
  title: string;
  description: string;
}

export function AttendanceHeader({ title, description }: AttendanceHeaderProps): React.ReactNode {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
