import React from 'react';
import PageLayout from '@/shared/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MaintenanceDashboard: React.FC = () => {
  const metrics = [
    { title: 'Total Machines', value: '42 Active', icon: <Wrench className="size-5 text-blue-500" /> },
    { title: 'Open Breakdowns', value: '3 Critical', icon: <AlertTriangle className="size-5 text-destructive" /> },
    { title: 'Preventive Due', value: '7 Tasks', icon: <Clock className="size-5 text-amber-500" /> },
    { title: 'MTTR Average', value: '1.4 Hours', icon: <CheckCircle className="size-5 text-emerald-500" /> },
  ];

  return (
    <PageLayout
      title="Maintenance Dashboard"
      breadcrumbs={[{ label: 'Platform' }, { label: 'Maintenance' }, { label: 'Dashboard' }]}
      actions={
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-medium">
          + Log Machine Breakdown
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => (
            <Card key={idx} className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">{m.title}</CardTitle>
                {m.icon}
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Proof of Concept Banner */}
        <Card className="border-amber-200 bg-amber-500/5">
          <CardContent className="p-6 space-y-2">
            <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
              <Wrench className="size-5 text-amber-600" />
              Multi-System Coexistence Verified
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              This Maintenance module operates autonomously inside its own system route namespace (<code>/maintenance/*</code>)
              and Layer 2 System Layout while sharing the universal Layer 1 Global Platform shell. Additional modules (Production, HR, CRM)
              can be plugged in using the same dynamic system registration specification.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default MaintenanceDashboard;
