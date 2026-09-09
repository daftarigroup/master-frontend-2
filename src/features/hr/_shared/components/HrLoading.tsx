'use client';

import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';

export function HrLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3">
        <IconLoader2 className="text-primary h-6 w-6 animate-spin" />
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}

export function HrError({
  title = 'Connection failed',
  description = 'Could not load data. Please try again or contact support.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="bg-danger/5 border-danger/20 max-w-md rounded-2xl border p-6 text-center">
        <div className="bg-danger/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          <IconAlertTriangle className="text-danger h-6 w-6" />
        </div>
        <h3 className="text-foreground text-base font-bold">{title}</h3>
        <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
      </div>
    </div>
  );
}

export default HrLoading;
