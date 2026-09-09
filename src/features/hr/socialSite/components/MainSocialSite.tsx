'use client';

import React, { useState } from 'react';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandYoutube,
  IconPlus,
  IconTrendingUp,
  IconUsers,
  IconEye,
  IconBriefcase,
  IconRefresh,
  IconCheck,
  IconExternalLink,
  IconTrash,
  IconAlertCircle,
  IconShare,
  IconLink,
} from '@tabler/icons-react';
import { HrModal } from '@/features/hr/_shared/components';
import { cn } from '@/lib/utils';

export interface SocialPost {
  id: string;
  title: string;
  type: 'job' | 'announcement';
  date: string;
  views: number;
  clicks: number;
  applies?: number;
  likes: number;
}

export interface SocialAccount {
  id: number | string;
  platform: 'LinkedIn' | 'Facebook' | 'Twitter' | 'Instagram' | 'YouTube';
  handle: string;
  profileUrl: string;
  followers: string;
  followersNum: number;
  growth: string;
  status: 'connected' | 'disconnected';
  lastSynced: string;
  impressions30d: string;
  engagementRate: string;
  jobClicks30d: number;
  applicants30d: number;
  color: string;
  bg: string;
  borderHover: string;
  recentPosts: SocialPost[];
}

const platformIcons = {
  LinkedIn: IconBrandLinkedin,
  Facebook: IconBrandFacebook,
  Twitter: IconBrandTwitter,
  Instagram: IconBrandInstagram,
  YouTube: IconBrandYoutube,
};

const initialAccounts: SocialAccount[] = [
  {
    id: 1,
    platform: 'LinkedIn',
    handle: 'pooja-constructions',
    profileUrl: 'https://linkedin.com/company/pooja-constructions',
    followers: '15,234',
    followersNum: 15234,
    growth: '+12%',
    status: 'connected',
    lastSynced: '10 minutes ago',
    impressions30d: '84,520',
    engagementRate: '4.8%',
    jobClicks30d: 1420,
    applicants30d: 86,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    borderHover: 'hover:border-blue-500/50',
    recentPosts: [
      {
        id: 'li-1',
        title: 'Hiring: Senior Project Manager - Structural Works (Navi Mumbai Site)',
        type: 'job',
        date: '2026-09-04',
        views: 2840,
        clicks: 142,
        applies: 38,
        likes: 94,
      },
      {
        id: 'li-2',
        title: 'Walk-In Drive: Quality Control Inspectors & Site Supervisors',
        type: 'job',
        date: '2026-08-30',
        views: 1960,
        clicks: 98,
        applies: 29,
        likes: 65,
      },
      {
        id: 'li-3',
        title: 'Celebrating zero accident safety milestone across all active site projects',
        type: 'announcement',
        date: '2026-08-25',
        views: 4120,
        clicks: 54,
        likes: 312,
      },
    ],
  },
  {
    id: 2,
    platform: 'Facebook',
    handle: 'PoojaConstructionsOfficial',
    profileUrl: 'https://facebook.com/PoojaConstructionsOfficial',
    followers: '8,920',
    followersNum: 8920,
    growth: '+5%',
    status: 'connected',
    lastSynced: '25 minutes ago',
    impressions30d: '42,110',
    engagementRate: '3.2%',
    jobClicks30d: 680,
    applicants30d: 42,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderHover: 'hover:border-indigo-500/50',
    recentPosts: [
      {
        id: 'fb-1',
        title: 'Immediate Opening: Store & Inventory Supervisor - Surewada Yard',
        type: 'job',
        date: '2026-09-02',
        views: 1250,
        clicks: 64,
        applies: 18,
        likes: 42,
      },
      {
        id: 'fb-2',
        title: 'Ganesh Chaturthi site celebrations and employee awards',
        type: 'announcement',
        date: '2026-08-28',
        views: 3200,
        clicks: 22,
        likes: 184,
      },
    ],
  },
  {
    id: 3,
    platform: 'Twitter',
    handle: '@poojaconstruct',
    profileUrl: 'https://twitter.com/poojaconstruct',
    followers: '5,100',
    followersNum: 5100,
    growth: '+2%',
    status: 'connected',
    lastSynced: '1 hour ago',
    impressions30d: '29,400',
    engagementRate: '2.1%',
    jobClicks30d: 410,
    applicants30d: 19,
    color: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    borderHover: 'hover:border-sky-500/50',
    recentPosts: [
      {
        id: 'tw-1',
        title: 'We are hiring! Multiple site engineering positions open across Maharashtra.',
        type: 'job',
        date: '2026-09-03',
        views: 1420,
        clicks: 82,
        applies: 12,
        likes: 38,
      },
      {
        id: 'tw-2',
        title: 'Modern precast technology in our upcoming commercial project.',
        type: 'announcement',
        date: '2026-08-22',
        views: 2100,
        clicks: 35,
        likes: 92,
      },
    ],
  },
  {
    id: 4,
    platform: 'Instagram',
    handle: '@poojaconstructions',
    profileUrl: 'https://instagram.com/poojaconstructions',
    followers: '12,450',
    followersNum: 12450,
    growth: '+20%',
    status: 'connected',
    lastSynced: '15 minutes ago',
    impressions30d: '95,300',
    engagementRate: '6.4%',
    jobClicks30d: 940,
    applicants30d: 54,
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    borderHover: 'hover:border-pink-500/50',
    recentPosts: [
      {
        id: 'ig-1',
        title: 'Behind the Scenes: A day in the life of our on-site civil engineers',
        type: 'announcement',
        date: '2026-09-05',
        views: 6840,
        clicks: 120,
        applies: 31,
        likes: 642,
      },
      {
        id: 'ig-2',
        title: 'Join our growing team! Apply through the link in our bio for open roles.',
        type: 'job',
        date: '2026-09-01',
        views: 5200,
        clicks: 210,
        applies: 23,
        likes: 418,
      },
    ],
  },
];

const MainSocialSite = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>(initialAccounts);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [disconnectModalAccount, setDisconnectModalAccount] = useState<SocialAccount | null>(null);

  // Connect form state
  const [formPlatform, setFormPlatform] = useState<SocialAccount['platform']>('LinkedIn');
  const [formHandle, setFormHandle] = useState('');
  const [formProfileUrl, setFormProfileUrl] = useState('');
  const [autoPublishJobs, setAutoPublishJobs] = useState(true);
  const [trackReferrals, setTrackReferrals] = useState(true);
  const [connectError, setConnectError] = useState('');

  const handleOpenConnect = () => {
    setFormPlatform('LinkedIn');
    setFormHandle('');
    setFormProfileUrl('');
    setAutoPublishJobs(true);
    setTrackReferrals(true);
    setConnectError('');
    setConnectModalOpen(true);
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHandle.trim()) {
      setConnectError('Please enter the account handle or company page name.');
      return;
    }

    const platformConfig = {
      LinkedIn: {
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        borderHover: 'hover:border-blue-500/50',
      },
      Facebook: {
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        borderHover: 'hover:border-indigo-500/50',
      },
      Twitter: {
        color: 'text-sky-500',
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        borderHover: 'hover:border-sky-500/50',
      },
      Instagram: {
        color: 'text-pink-600',
        bg: 'bg-pink-50 dark:bg-pink-950/40',
        borderHover: 'hover:border-pink-500/50',
      },
      YouTube: {
        color: 'text-red-600',
        bg: 'bg-red-50 dark:bg-red-950/40',
        borderHover: 'hover:border-red-500/50',
      },
    }[formPlatform];

    // Check if platform already exists
    const existingIndex = accounts.findIndex((a) => a.platform === formPlatform);
    if (existingIndex >= 0) {
      // Reconnect/Update
      const updated = [...accounts];
      updated[existingIndex] = {
        ...updated[existingIndex],
        handle: formHandle.trim(),
        profileUrl:
          formProfileUrl.trim() ||
          `https://${formPlatform.toLowerCase()}.com/${formHandle.replace('@', '')}`,
        status: 'connected',
        lastSynced: 'Just now',
      };
      setAccounts(updated);
    } else {
      // New account
      const newAccount: SocialAccount = {
        id: Date.now(),
        platform: formPlatform,
        handle: formHandle.trim(),
        profileUrl:
          formProfileUrl.trim() ||
          `https://${formPlatform.toLowerCase()}.com/${formHandle.replace('@', '')}`,
        followers: '1,050',
        followersNum: 1050,
        growth: '+10%',
        status: 'connected',
        lastSynced: 'Just now',
        impressions30d: '12,400',
        engagementRate: '3.5%',
        jobClicks30d: 140,
        applicants30d: 12,
        color: platformConfig.color,
        bg: platformConfig.bg,
        borderHover: platformConfig.borderHover,
        recentPosts: [
          {
            id: `post-${Date.now()}`,
            title: 'Welcome to Pooja Constructions careers and site updates!',
            type: 'announcement',
            date: new Date().toISOString().slice(0, 10),
            views: 450,
            clicks: 22,
            likes: 45,
          },
        ],
      };
      setAccounts((prev) => [...prev, newAccount]);
    }

    setConnectModalOpen(false);
  };

  const handleSyncAnalytics = () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccessMsg('Analytics synced successfully!');
      if (selectedAccount) {
        const updated = accounts.map((a) =>
          a.id === selectedAccount.id ? { ...a, lastSynced: 'Just now' } : a
        );
        setAccounts(updated);
        setSelectedAccount((prev) => (prev ? { ...prev, lastSynced: 'Just now' } : null));
      }
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    }, 1000);
  };

  const handleConfirmDisconnect = () => {
    if (!disconnectModalAccount) return;
    setAccounts((prev) =>
      prev.map((a) => (a.id === disconnectModalAccount.id ? { ...a, status: 'disconnected' } : a))
    );
    if (selectedAccount?.id === disconnectModalAccount.id) {
      setSelectedAccount((prev) => (prev ? { ...prev, status: 'disconnected' } : null));
    }
    setDisconnectModalAccount(null);
  };

  const handleReconnect = (account: SocialAccount) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, status: 'connected', lastSynced: 'Just now' } : a))
    );
    if (selectedAccount?.id === account.id) {
      setSelectedAccount((prev) =>
        prev ? { ...prev, status: 'connected', lastSynced: 'Just now' } : null
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Social Presence</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {accounts.filter((a) => a.status === 'connected').length} Connected
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Monitor company social media accounts, track candidate reach, and publish job requisitions
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenConnect}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 sm:text-sm"
        >
          <IconPlus className="h-4 w-4" strokeWidth={2.5} />
          Connect Account
        </button>
      </div>

      {/* Social Accounts Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map((social) => {
          const Icon = platformIcons[social.platform];
          const isConnected = social.status === 'connected';

          return (
            <div
              key={social.id}
              className={cn(
                'group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-center transition-all duration-200 hover:shadow-lg',
                social.borderHover,
                !isConnected && 'opacity-70 bg-muted/20'
              )}
            >
              {/* Status indicator badge */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    isConnected
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                    )}
                  />
                  {isConnected ? 'Active' : 'Disconnected'}
                </span>

                <span className="text-[11px] text-muted-foreground truncate max-w-28">
                  {social.lastSynced}
                </span>
              </div>

              {/* Icon & Platform Info */}
              <div className="my-4 flex flex-col items-center">
                <div
                  className={cn(
                    'mb-3 flex h-14 w-14 items-center justify-center rounded-2xl p-3 shadow-xs transition-transform group-hover:scale-105',
                    social.bg
                  )}
                >
                  <Icon className={cn('h-8 w-8', social.color)} />
                </div>
                <h3 className="text-base font-bold text-foreground">{social.platform}</h3>
                <p className="text-xs text-muted-foreground truncate max-w-44">
                  {social.handle}
                </p>

                {/* Follower Count & Growth */}
                <div className="mt-3 flex items-baseline justify-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {social.followers}
                  </span>
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <IconTrendingUp className="mr-0.5 h-3.5 w-3.5" />
                    {social.growth}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">Followers</span>
              </div>

              {/* Action Button */}
              {isConnected ? (
                <button
                  type="button"
                  onClick={() => setSelectedAccount(social)}
                  className="w-full rounded-xl border border-border bg-muted/40 py-2 text-xs font-semibold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-transparent active:scale-95"
                >
                  View Analytics
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReconnect(social)}
                  className="w-full rounded-xl border border-primary/30 bg-primary/10 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                >
                  Reconnect
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 1. CONNECT ACCOUNT MODAL (Standard Popup) ── */}
      <HrModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title="Connect Social Account"
        description="Link your company's social profile to auto-publish job vacancies and track applicant reach."
        icon={IconShare}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConnectModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConnectSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <IconCheck className="h-4 w-4" />
              Connect Account
            </button>
          </>
        }
      >
        <form onSubmit={handleConnectSubmit} className="space-y-4 py-1">
          {connectError && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              <span>{connectError}</span>
            </div>
          )}

          {/* Platform Selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-foreground">
              Choose Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['LinkedIn', 'Facebook', 'Twitter', 'Instagram'] as const).map((plat) => {
                const Icon = platformIcons[plat];
                const isSelected = formPlatform === plat;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => {
                      setFormPlatform(plat);
                      setConnectError('');
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20'
                        : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{plat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Handle / Page Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Account Handle / Page Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  formPlatform === 'LinkedIn'
                    ? 'e.g. pooja-constructions'
                    : formPlatform === 'Twitter'
                    ? 'e.g. @poojaconstruct'
                    : 'e.g. Pooja Constructions'
                }
                value={formHandle}
                onChange={(e) => {
                  setFormHandle(e.target.value);
                  setConnectError('');
                }}
                className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:bg-background"
              />
            </div>
          </div>

          {/* Profile / Page URL */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Public Profile / Company Page URL
            </label>
            <div className="relative">
              <IconLink className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                placeholder={`https://${formPlatform.toLowerCase()}.com/company/...`}
                value={formProfileUrl}
                onChange={(e) => setFormProfileUrl(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 pl-10 pr-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:bg-background"
              />
            </div>
          </div>

          {/* Permissions & Scopes */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
            <p className="text-xs font-semibold text-foreground">Permissions & Sync Options</p>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPublishJobs}
                onChange={(e) => setAutoPublishJobs(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Auto-publish approved job requisitions</p>
                <p className="text-muted-foreground text-[11px]">
                  Posts will automatically be created when HR job indents are approved.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={trackReferrals}
                onChange={(e) => setTrackReferrals(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Track applicant source links</p>
                <p className="text-muted-foreground text-[11px]">
                  Attaches referral tracking parameters to calculate social candidate conversion.
                </p>
              </div>
            </label>
          </div>
        </form>
      </HrModal>

      {/* ── 2. VIEW ANALYTICS MODAL (Standard Popup) ── */}
      {selectedAccount && (
        <HrModal
          open={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
          title={`${selectedAccount.platform} Analytics & Postings`}
          description={`Channel: ${selectedAccount.handle} • Status: ${selectedAccount.status === 'connected' ? 'Active' : 'Disconnected'}`}
          icon={platformIcons[selectedAccount.platform]}
          size="xl"
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => setDisconnectModalAccount(selectedAccount)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
              >
                <IconTrash className="h-3.5 w-3.5" />
                Disconnect Channel
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={selectedAccount.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <IconExternalLink className="h-3.5 w-3.5" />
                  Open Live Profile
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedAccount(null)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 py-1">
            {/* Sync Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Last synced:</span>
                <span className="font-semibold text-foreground">{selectedAccount.lastSynced}</span>
                {syncSuccessMsg && (
                  <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                    <IconCheck className="h-3.5 w-3.5" />
                    {syncSuccessMsg}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSyncAnalytics}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted active:scale-95 disabled:opacity-60 transition-all"
              >
                <IconRefresh className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin text-primary')} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <IconUsers className="h-4 w-4 text-primary" />
                  <span>Audience</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">{selectedAccount.followers}</p>
                <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold">
                  {selectedAccount.growth} this month
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <IconEye className="h-4 w-4 text-blue-500" />
                  <span>30-Day Impressions</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {selectedAccount.impressions30d}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Organic post reach</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <IconTrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Engagement Rate</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {selectedAccount.engagementRate}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Likes, shares & comments</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <IconBriefcase className="h-4 w-4 text-amber-500" />
                  <span>Job Conversions</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {selectedAccount.applicants30d}{' '}
                  <span className="text-xs font-normal text-muted-foreground">applies</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  From {selectedAccount.jobClicks30d} link clicks
                </p>
              </div>
            </div>

            {/* Recent Posts & Recruitment Reach Table */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">Recent Postings & Reach</h4>
                <span className="text-[11px] text-muted-foreground">
                  {selectedAccount.recentPosts.length} posts tracked
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3.5 py-2.5">Post Content / Role</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Published</th>
                      <th className="px-3 py-2.5 text-right">Views</th>
                      <th className="px-3 py-2.5 text-right">Clicks</th>
                      <th className="px-3.5 py-2.5 text-right">Applicants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedAccount.recentPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3.5 py-3 font-medium text-foreground max-w-xs truncate">
                          {post.title}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              post.type === 'job'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {post.type === 'job' ? 'Job Requisition' : 'Company News'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                          {post.date}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                          {post.views.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">
                          {post.clicks.toLocaleString()}
                        </td>
                        <td className="px-3.5 py-3 text-right font-bold tabular-nums text-emerald-600">
                          {post.applies ? post.applies.toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </HrModal>
      )}

      {/* ── 3. DISCONNECT CONFIRMATION DIALOG ── */}
      {disconnectModalAccount && (
        <HrModal
          open={!!disconnectModalAccount}
          onClose={() => setDisconnectModalAccount(null)}
          title={`Disconnect ${disconnectModalAccount.platform}?`}
          description="Are you sure you want to disconnect this account? Auto-posting and analytics sync will be paused."
          icon={IconAlertCircle}
          iconTone="danger"
          size="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDisconnectModalAccount(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Keep Connected
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
              >
                Disconnect
              </button>
            </>
          }
        >
          <div className="py-2 text-xs text-muted-foreground">
            You can reconnect this channel at any time without losing historical engagement records.
          </div>
        </HrModal>
      )}
    </div>
  );
};

export default MainSocialSite;
