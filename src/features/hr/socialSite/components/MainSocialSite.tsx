'use client';

import React, { useEffect, useState } from 'react';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandYoutube,
  IconPlus,
  IconTrendingUp,
  IconTrendingDown,
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
import {
  useConnectAccount,
  useDisconnectAccount,
  useReconnectAccount,
  useSocialAccounts,
  useSyncAccount,
} from '../server/tanstackQuery/useSocialSiteQueries';
import type { SocialAccount, SocialPlatform, SyncAccountDto } from '../types/types';

// ── Platform presentation (icon/colors) — not part of the data model ──────────

const platformStyles: Record<
  SocialPlatform,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; borderHover: string }
> = {
  LinkedIn: {
    icon: IconBrandLinkedin,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    borderHover: 'hover:border-blue-500/50',
  },
  Facebook: {
    icon: IconBrandFacebook,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderHover: 'hover:border-indigo-500/50',
  },
  Twitter: {
    icon: IconBrandTwitter,
    color: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    borderHover: 'hover:border-sky-500/50',
  },
  Instagram: {
    icon: IconBrandInstagram,
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    borderHover: 'hover:border-pink-500/50',
  },
  YouTube: {
    icon: IconBrandYoutube,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/40',
    borderHover: 'hover:border-red-500/50',
  },
};

// ── Formatting helpers ─────────────────────────────────────────────────────────

const fmtNum = (n: number) => n.toLocaleString('en-IN');
const fmtGrowth = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtPercent = (n: number) => `${n.toFixed(2)}%`;

const timeAgo = (iso: string | null) => {
  if (!iso) return 'Never synced';
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const emptySyncForm: SyncAccountDto = {
  followersNum: 0,
  impressions30d: 0,
  engagementRate: 0,
  jobClicks30d: 0,
  applicants30d: 0,
};

const MainSocialSite = () => {
  const { data: accountsData, isLoading } = useSocialAccounts();
  const accounts = accountsData ?? [];

  const connectMutation = useConnectAccount();
  const disconnectMutation = useDisconnectAccount();
  const reconnectMutation = useReconnectAccount();
  const syncMutation = useSyncAccount();

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [disconnectAccountId, setDisconnectAccountId] = useState<number | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const disconnectModalAccount = accounts.find((a) => a.id === disconnectAccountId) ?? null;

  // Connect form state
  const [formPlatform, setFormPlatform] = useState<SocialPlatform>('LinkedIn');
  const [formHandle, setFormHandle] = useState('');
  const [formProfileUrl, setFormProfileUrl] = useState('');
  const [autoPublishJobs, setAutoPublishJobs] = useState(true);
  const [trackReferrals, setTrackReferrals] = useState(true);
  const [connectError, setConnectError] = useState('');

  // Sync form state — pre-filled with the selected account's current stats
  const [syncForm, setSyncForm] = useState<SyncAccountDto>(emptySyncForm);

  useEffect(() => {
    if (selectedAccount) {
      setSyncForm({
        followersNum: selectedAccount.followersNum,
        impressions30d: selectedAccount.impressions30d,
        engagementRate: selectedAccount.engagementRate,
        jobClicks30d: selectedAccount.jobClicks30d,
        applicants30d: selectedAccount.applicants30d,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  const handleOpenConnect = () => {
    setFormPlatform('LinkedIn');
    setFormHandle('');
    setFormProfileUrl('');
    setAutoPublishJobs(true);
    setTrackReferrals(true);
    setConnectError('');
    setConnectModalOpen(true);
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHandle.trim()) {
      setConnectError('Please enter the account handle or company page name.');
      return;
    }
    try {
      await connectMutation.mutateAsync({
        platform: formPlatform,
        handle: formHandle.trim(),
        profileUrl: formProfileUrl.trim() || undefined,
        autoPublishJobs,
        trackReferrals,
      });
      setConnectModalOpen(false);
    } catch (err) {
      setConnectError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to connect account'
      );
    }
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSyncSuccessMsg(null);
    try {
      await syncMutation.mutateAsync({ id: selectedAccount.id, data: syncForm });
      setSyncSuccessMsg('Analytics synced successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch {
      // mutation error state is surfaced via syncMutation.isError below
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectModalAccount) return;
    await disconnectMutation.mutateAsync(disconnectModalAccount.id);
    setDisconnectAccountId(null);
  };

  const handleReconnect = (account: SocialAccount) => {
    reconnectMutation.mutate(account.id);
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
      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
          Loading connected accounts…
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
          No social accounts connected yet. Click "Connect Account" to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accounts.map((social) => {
            const style = platformStyles[social.platform];
            const Icon = style.icon;
            const isConnected = social.status === 'connected';

            return (
              <div
                key={social.id}
                className={cn(
                  'group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-center transition-all duration-200 hover:shadow-lg',
                  style.borderHover,
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
                    {timeAgo(social.lastSyncedAt)}
                  </span>
                </div>

                {/* Icon & Platform Info */}
                <div className="my-4 flex flex-col items-center">
                  <div
                    className={cn(
                      'mb-3 flex h-14 w-14 items-center justify-center rounded-2xl p-3 shadow-xs transition-transform group-hover:scale-105',
                      style.bg
                    )}
                  >
                    <Icon className={cn('h-8 w-8', style.color)} />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{social.platform}</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-44">{social.handle}</p>

                  {/* Follower Count & Growth */}
                  <div className="mt-3 flex items-baseline justify-center gap-2">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {fmtNum(social.followersNum)}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center text-xs font-semibold',
                        social.growthPercent >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-destructive'
                      )}
                    >
                      {social.growthPercent >= 0 ? (
                        <IconTrendingUp className="mr-0.5 h-3.5 w-3.5" />
                      ) : (
                        <IconTrendingDown className="mr-0.5 h-3.5 w-3.5" />
                      )}
                      {fmtGrowth(social.growthPercent)}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Followers</span>
                </div>

                {/* Action Button */}
                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => setSelectedAccountId(social.id)}
                    className="w-full rounded-xl border border-border bg-muted/40 py-2 text-xs font-semibold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-transparent active:scale-95"
                  >
                    View Analytics
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReconnect(social)}
                    disabled={reconnectMutation.isPending}
                    className="w-full rounded-xl border border-primary/30 bg-primary/10 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-60"
                  >
                    {reconnectMutation.isPending && reconnectMutation.variables === social.id
                      ? 'Reconnecting…'
                      : 'Reconnect'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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
              disabled={connectMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
            >
              <IconCheck className="h-4 w-4" />
              {connectMutation.isPending ? 'Connecting…' : 'Connect Account'}
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
                const Icon = platformStyles[plat].icon;
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
          onClose={() => setSelectedAccountId(null)}
          title={`${selectedAccount.platform} Analytics & Postings`}
          description={`Channel: ${selectedAccount.handle} • Status: ${selectedAccount.status === 'connected' ? 'Active' : 'Disconnected'}`}
          icon={platformStyles[selectedAccount.platform].icon}
          size="xl"
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => setDisconnectAccountId(selectedAccount.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
              >
                <IconTrash className="h-3.5 w-3.5" />
                Disconnect Channel
              </button>
              <div className="flex items-center gap-2">
                {selectedAccount.profileUrl && (
                  <a
                    href={selectedAccount.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <IconExternalLink className="h-3.5 w-3.5" />
                    Open Live Profile
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(null)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 py-1">
            {/* Sync Form */}
            <form
              onSubmit={handleSyncSubmit}
              className="space-y-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Last synced:</span>
                  <span className="font-semibold text-foreground">
                    {timeAgo(selectedAccount.lastSyncedAt)}
                  </span>
                  {syncSuccessMsg && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                      <IconCheck className="h-3.5 w-3.5" />
                      {syncSuccessMsg}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={syncMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted active:scale-95 disabled:opacity-60 transition-all"
                >
                  <IconRefresh
                    className={cn('h-3.5 w-3.5', syncMutation.isPending && 'animate-spin text-primary')}
                  />
                  {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {(
                  [
                    ['followersNum', 'Followers'],
                    ['impressions30d', '30d Impressions'],
                    ['engagementRate', 'Engagement %'],
                    ['jobClicks30d', 'Job Clicks'],
                    ['applicants30d', 'Applicants'],
                  ] as [keyof SyncAccountDto, string][]
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
                      {label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={key === 'engagementRate' ? 0.01 : 1}
                      value={syncForm[key]}
                      onChange={(e) =>
                        setSyncForm((p) => ({ ...p, [key]: Number(e.target.value) || 0 }))
                      }
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </form>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <IconUsers className="h-4 w-4 text-primary" />
                  <span>Audience</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {fmtNum(selectedAccount.followersNum)}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold">
                  {fmtGrowth(selectedAccount.growthPercent)} this sync
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <IconEye className="h-4 w-4 text-blue-500" />
                  <span>30-Day Impressions</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {fmtNum(selectedAccount.impressions30d)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Organic post reach</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                  <IconTrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Engagement Rate</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {fmtPercent(selectedAccount.engagementRate)}
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
                  From {fmtNum(selectedAccount.jobClicks30d)} link clicks
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

              {selectedAccount.recentPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
                  No posts recorded yet for this channel.
                </div>
              ) : (
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
                            {post.publishedAt}
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
              )}
            </div>
          </div>
        </HrModal>
      )}

      {/* ── 3. DISCONNECT CONFIRMATION DIALOG ── */}
      {disconnectModalAccount && (
        <HrModal
          open={!!disconnectModalAccount}
          onClose={() => setDisconnectAccountId(null)}
          title={`Disconnect ${disconnectModalAccount.platform}?`}
          description="Are you sure you want to disconnect this account? Auto-posting and analytics sync will be paused."
          icon={IconAlertCircle}
          iconTone="danger"
          size="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDisconnectAccountId(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Keep Connected
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnectMutation.isPending}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm disabled:opacity-60"
              >
                {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
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
