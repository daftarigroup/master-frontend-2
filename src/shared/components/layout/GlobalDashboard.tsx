import React from 'react';
import PageLayout from './PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Store, CheckSquare, FileText, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const GlobalDashboard: React.FC = () => {
  const navigate = useNavigate();

  const activeSystems = [
    {
      id: 'store',
      name: 'Store & Inventory System',
      description: 'Material requisitions, store check-in (GRN), PO creation, inventory stock balance, and payment processing.',
      icon: <Store className="size-6 text-blue-600" />,
      color: 'bg-blue-500/10 border-blue-200',
      badge: 'Active System',
      path: '/store/dashboard',
      stats: '43 Views Active',
    },
    {
      id: 'checklist',
      name: 'Checklist & Delegation System',
      description: 'Task assignments, recurring checklists, delegation logs, and verification workflows.',
      icon: <CheckSquare className="size-6 text-purple-600" />,
      color: 'bg-purple-500/10 border-purple-200',
      badge: 'Active System',
      path: '/checklist/dashboard',
      stats: '6 Views Active',
    },
    {
      id: 'document',
      name: 'Document & Subscription System',
      description: 'Document repository, contract tracking, license management, and recurring subscriptions.',
      icon: <FileText className="size-6 text-muted-foreground" />,
      color: 'bg-muted/30 border-dashed',
      badge: 'Coming Soon',
      path: '#',
      disabled: true,
      stats: 'Upcoming Update',
    },
    {
      id: 'petty_cash',
      name: 'Petty Cash System',
      description: 'Small expense logging, voucher approvals, cash float balances, and audit reports.',
      icon: <Wallet className="size-6 text-muted-foreground" />,
      color: 'bg-muted/30 border-dashed',
      badge: 'Coming Soon',
      path: '#',
      disabled: true,
      stats: 'Upcoming Update',
    },
  ];

  return (
    <PageLayout
      title="Platform Enterprise Dashboard"
      breadcrumbs={[{ label: 'Platform' }, { label: 'Global Dashboard' }]}
    >
      <div className="space-y-6">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-bold">Welcome to Enterprise Master System</h2>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Multi-System Enterprise Architecture is active. Switch between functional business modules using the top system selector or the system navigation sidebar.
            </p>
          </CardContent>
        </Card>

        {/* System Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeSystems.map((sys) => (
            <Card
              key={sys.id}
              className={`transition-all duration-200 hover:shadow-md ${sys.color} ${sys.disabled ? 'opacity-60' : 'cursor-pointer'}`}
              onClick={() => !sys.disabled && navigate(sys.path)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-background shadow-xs">{sys.icon}</div>
                  <div>
                    <CardTitle className="text-sm font-bold">{sys.name}</CardTitle>
                    <span className="text-[10px] text-muted-foreground font-mono">{sys.stats}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sys.disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                  {sys.badge}
                </span>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <CardDescription className="text-xs">{sys.description}</CardDescription>
                {!sys.disabled && (
                  <Button size="sm" variant="ghost" className="text-xs text-primary p-0 h-auto gap-1 font-semibold hover:bg-transparent">
                    Open {sys.name} <ArrowRight className="size-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default GlobalDashboard;
