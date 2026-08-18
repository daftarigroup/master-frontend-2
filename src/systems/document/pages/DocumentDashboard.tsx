import React, { useEffect, useState } from 'react';
import {
  FileText,
  CreditCard,
  Banknote,
  CheckCircle,
  FileCheck,
  RotateCcw,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { documentsApi, subscriptionsApi, loansApi } from '../services/document.api';
import { formatDate } from '../utils/dateFormatter';
import { MacModal } from '@/components/ui/mac-modal';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  subtext?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtext, onClick }) => (
  <div
    onClick={onClick}
    className="bg-card border rounded-lg p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer group relative overflow-hidden"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">{title}</p>
        <h3 className="text-xl font-bold text-foreground mt-1 tracking-tight group-hover:text-primary transition-colors">
          {value}
        </h3>
        {subtext && <p className="text-[11px] text-muted-foreground mt-1">{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
  </div>
);

export const DocumentDashboard: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const navigate = useNavigate();
  const [selectedStat, setSelectedStat] = useState<{
    type: string;
    title: string;
    data: { label: string; count: number }[];
    link: string;
  } | null>(null);

  useEffect(() => {
    documentsApi.list().then((res: any) => setDocuments(Array.isArray(res) ? res : res?.data || [])).catch(() => {});
    subscriptionsApi.list().then((res: any) => setSubscriptions(Array.isArray(res) ? res : res?.data || [])).catch(() => {});
    loansApi.list().then((res: any) => setLoans(Array.isArray(res) ? res : res?.data || [])).catch(() => {});
  }, []);

  const totalDocuments = documents.length;
  const totalSubscriptions = subscriptions.length;
  const totalLoans = loans.length;

  const totalRenewals = documents.filter((doc) => doc.needsRenewal).length;
  const pendingApprovals = subscriptions.filter((sub) => !sub.status || sub.status === 'Pending').length;
  const nocCompleted = loans.filter((loan) => loan.collectNocStatus === 'Yes').length;

  const monthlySubscriptionCost = subscriptions.reduce((acc, sub) => {
    let price = parseFloat(String(sub.price || '0').replace(/[^\d.]/g, '')) || 0;
    if (sub.frequency === 'Yearly') price = price / 12;
    if (sub.frequency === 'Quarterly') price = price / 3;
    if (sub.frequency === 'Half-Yearly' || sub.frequency === '6 Months') price = price / 6;
    return acc + price;
  }, 0);

  const getDocumentStats = () => {
    const counts: Record<string, number> = {};
    documents.forEach((doc) => {
      const key = doc.category || 'Uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getSubscriptionStats = () => {
    const counts: Record<string, number> = {};
    subscriptions.forEach((sub) => {
      const key = sub.frequency || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getLoanStats = () => {
    const counts: Record<string, number> = {};
    loans.forEach((loan) => {
      const key = loan.bankName || 'Unknown Bank';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getRenewalStats = () => {
    const counts: Record<string, number> = {};
    documents
      .filter((d) => d.needsRenewal)
      .forEach((doc) => {
        const key = doc.category || 'Uncategorized';
        counts[key] = (counts[key] || 0) + 1;
      });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getApprovalStats = () => {
    const counts: Record<string, number> = {};
    subscriptions
      .filter((s) => !s.status || s.status === 'Pending')
      .forEach((sub) => {
        const key = sub.frequency || 'Unknown';
        counts[key] = (counts[key] || 0) + 1;
      });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getNocStats = () => {
    const counts: Record<string, number> = {};
    loans
      .filter((l) => l.collectNocStatus === 'Yes')
      .forEach((loan) => {
        const key = loan.bankName || 'Unknown Bank';
        counts[key] = (counts[key] || 0) + 1;
      });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const handleStatClick = (type: string) => {
    if (type === 'documents') {
      setSelectedStat({
        type: 'documents',
        title: 'Documents by Category',
        data: getDocumentStats(),
        link: '/document/all',
      });
    } else if (type === 'subscriptions') {
      setSelectedStat({
        type: 'subscriptions',
        title: 'Subscriptions by Frequency',
        data: getSubscriptionStats(),
        link: '/document/subscription/all',
      });
    } else if (type === 'loans') {
      setSelectedStat({
        type: 'loans',
        title: 'Loans by Bank',
        data: getLoanStats(),
        link: '/document/loan/all',
      });
    } else if (type === 'renewals') {
      setSelectedStat({
        type: 'renewals',
        title: 'Pending Renewals by Category',
        data: getRenewalStats(),
        link: '/document/renewal',
      });
    } else if (type === 'approvals') {
      setSelectedStat({
        type: 'approvals',
        title: 'Pending Approvals by Frequency',
        data: getApprovalStats(),
        link: '/document/subscription/approval',
      });
    } else if (type === 'noc') {
      setSelectedStat({
        type: 'noc',
        title: 'NOC Completed by Bank',
        data: getNocStats(),
        link: '/document/loan/noc',
      });
    }
  };

  // Subscriptions Breakdown
  const subStatusCounts = {
    Active: subscriptions.filter((s) => s.status === 'Paid').length,
    Pending: subscriptions.filter((s) => !s.status || s.status === 'Pending').length,
    Approved: subscriptions.filter((s) => s.status === 'Approved').length,
    Rejected: subscriptions.filter((s) => s.status === 'Rejected').length,
  };

  const subscriptionStatusData = [
    { name: 'Active', value: subStatusCounts.Active, color: '#10B981' },
    { name: 'Pending', value: subStatusCounts.Pending, color: '#F59E0B' },
    { name: 'Approved', value: subStatusCounts.Approved, color: '#3B82F6' },
    { name: 'Rejected', value: subStatusCounts.Rejected, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  // Documents Breakdown
  const docStatusCounts = { Active: 0, Expiring: 0, Expired: 0 };
  const today = new Date();
  documents.forEach((doc) => {
    if (!doc.renewalDate) {
      docStatusCounts.Active++;
      return;
    }
    const renewalDate = new Date(doc.renewalDate);
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      docStatusCounts.Expired++;
    } else if (diffDays <= 30) {
      docStatusCounts.Expiring++;
    } else {
      docStatusCounts.Active++;
    }
  });

  const documentStatusData = [
    { name: 'Active', value: docStatusCounts.Active, color: '#3B82F6' },
    { name: 'Expiring', value: docStatusCounts.Expiring, color: '#F97316' },
    { name: 'Expired', value: docStatusCounts.Expired, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  // Loans Breakdown
  const loanStatusCounts = { Active: 0, Foreclosure: 0, Closed: 0 };
  loans.forEach((loan) => {
    if (loan.finalSettlementStatus === 'Yes') {
      loanStatusCounts.Closed++;
    } else if (loan.foreclosureStatus === 'Approved') {
      loanStatusCounts.Foreclosure++;
    } else {
      loanStatusCounts.Active++;
    }
  });

  const loanStatusData = [
    { name: 'Active', value: loanStatusCounts.Active, color: '#8B5CF6' },
    { name: 'Foreclosure', value: loanStatusCounts.Foreclosure, color: '#EC4899' },
    { name: 'Closed', value: loanStatusCounts.Closed, color: '#6B7280' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Modal Popup for Category Drilldown */}
      <MacModal
        isOpen={Boolean(selectedStat)}
        onClose={() => setSelectedStat(null)}
        title={selectedStat?.title}
        subtitle="Summary breakdown by classification"
        maxWidth="md"
        footer={
          <button
            onClick={() => {
              if (selectedStat?.link) {
                navigate(selectedStat.link);
              }
              setSelectedStat(null);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-sm"
          >
            View Full List
          </button>
        }
      >
        <div className="max-h-[50vh] overflow-y-auto">
          {selectedStat && selectedStat.data.length > 0 ? (
            <div className="divide-y divide-border/60">
              {selectedStat.data.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-accent/40 text-xs transition-colors">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold font-mono">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs italic">No data records available</div>
          )}
        </div>
      </MacModal>

      {/* Primary Stats: Totals */}
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Resource Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            title="Total Documents"
            value={totalDocuments}
            icon={FileText}
            color="bg-blue-500 text-blue-600"
            subtext="All stored & tracked records"
            onClick={() => handleStatClick('documents')}
          />
          <StatCard
            title="Total Subscriptions"
            value={totalSubscriptions}
            icon={CreditCard}
            color="bg-purple-500 text-purple-600"
            subtext={`₹${monthlySubscriptionCost.toFixed(0)} / mo estimated spend`}
            onClick={() => handleStatClick('subscriptions')}
          />
          <StatCard
            title="Total Loans"
            value={totalLoans}
            icon={Banknote}
            color="bg-emerald-500 text-emerald-600"
            subtext="Active bank finance records"
            onClick={() => handleStatClick('loans')}
          />
        </div>
      </div>

      {/* Secondary Stats: Action Items */}
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Action Items &amp; Compliance Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            title="Renewals Pending"
            value={totalRenewals}
            icon={RotateCcw}
            color="bg-orange-500 text-orange-600"
            subtext="Documents requiring renewal"
            onClick={() => handleStatClick('renewals')}
          />
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals}
            icon={CheckCircle}
            color="bg-indigo-500 text-indigo-600"
            subtext="Subscriptions waiting for approval"
            onClick={() => handleStatClick('approvals')}
          />
          <StatCard
            title="NOC Completed"
            value={nocCompleted}
            icon={FileCheck}
            color="bg-teal-500 text-teal-600"
            subtext="Loans with NOC safely received"
            onClick={() => handleStatClick('noc')}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Subscription Breakdown Chart */}
        <div className="bg-card p-4 rounded-lg border shadow-xs flex flex-col items-center">
          <h3 className="font-bold text-xs text-foreground mb-0.5 w-full text-left">Subscriptions</h3>
          <p className="text-[11px] text-muted-foreground mb-2 w-full text-left">By current status</p>
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {subscriptionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
              <span className="text-xl font-bold text-foreground">{totalSubscriptions}</span>
            </div>
          </div>
        </div>

        {/* 2. Document Status Chart */}
        <div className="bg-card p-4 rounded-lg border shadow-xs flex flex-col items-center">
          <h3 className="font-bold text-xs text-foreground mb-0.5 w-full text-left">Documents</h3>
          <p className="text-[11px] text-muted-foreground mb-2 w-full text-left">By renewal status</p>
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={documentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {documentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
              <span className="text-xl font-bold text-foreground">{totalDocuments}</span>
            </div>
          </div>
        </div>

        {/* 3. Loan Status Chart */}
        <div className="bg-card p-4 rounded-lg border shadow-xs flex flex-col items-center">
          <h3 className="font-bold text-xs text-foreground mb-0.5 w-full text-left">Loans</h3>
          <p className="text-[11px] text-muted-foreground mb-2 w-full text-left">By closure &amp; active status</p>
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loanStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {loanStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
              <span className="text-xl font-bold text-foreground">{totalLoans}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-card p-5 rounded-lg border shadow-xs">
        <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-primary" />
          Recent Activity Timeline
        </h3>
        <div className="space-y-4 pl-3 border-l-2 border-border ml-2">
          {[
            ...documents.map((doc) => ({
              id: doc.id,
              type: 'document',
              title: 'Document Added',
              desc: `New document '${doc.documentName}' added under ${doc.category}`,
              time: doc.date,
              rawDate: doc.date,
              icon: FileText,
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
            })),
            ...subscriptions.map((sub) => ({
              id: sub.id,
              type: 'subscription',
              title: 'Subscription Registered',
              desc: `Subscription for '${sub.companyName}' (${sub.frequency}) was recorded`,
              time: sub.requestedDate,
              rawDate: sub.requestedDate,
              icon: CreditCard,
              color: 'text-purple-500',
              bg: 'bg-purple-500/10',
            })),
            ...loans.map((loan) => ({
              id: loan.id,
              type: 'loan',
              title: 'Loan Account Entry',
              desc: `Loan record for '${loan.loanName}' with ${loan.bankName}`,
              time: loan.startDate,
              rawDate: loan.startDate,
              icon: Banknote,
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
            })),
          ]
            .sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime())
            .slice(0, 6)
            .map((activity, index) => (
              <div key={index} className="relative group">
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-md ${activity.bg} shrink-0`}>
                    <activity.icon size={16} className={activity.color} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-foreground">{activity.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.desc}</p>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                      {formatDate(activity.time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentDashboard;
