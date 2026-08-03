import React from 'react';
import Heading from '@/components/element/Heading';
import { ChevronRight } from 'lucide-react';
import Loading from '@/components/views/Loading';

interface PageBreadcrumb {
  label: string;
  path?: string;
}

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: PageBreadcrumb[];
  children: React.ReactNode;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle = 'Store & Enterprise Management System',
  breadcrumbs = [],
  children,
  actions,
  toolbar,
  loading = false,
  error = null,
}) => {
  if (loading) return <Loading />;

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Breadcrumb Header Trail */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium px-1">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="size-3.5 opacity-60" />}
              {b.path ? (
                <a href={b.path} className="hover:text-foreground transition-colors">
                  {b.label}
                </a>
              ) : (
                <span className="text-foreground font-semibold">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Page Heading & Actions Banner */}
      <Heading heading={title} subtext={subtitle} action={actions}>
        <div />
      </Heading>

      {/* Optional Search / Filter Toolbar */}
      {toolbar && (
        <div className="p-3 bg-card rounded-md border shadow-xs flex flex-wrap items-center gap-3">
          {toolbar}
        </div>
      )}

      {/* Error Boundary Fallback Alert */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Primary View Content Canvas */}
      <div className="w-full min-w-0">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
