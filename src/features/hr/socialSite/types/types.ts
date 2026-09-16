export type SocialPlatform = 'LinkedIn' | 'Facebook' | 'Twitter' | 'Instagram' | 'YouTube';

export interface SocialPost {
  id: number;
  title: string;
  type: 'job' | 'announcement';
  indentId: string | null;
  publishedAt: string;
  views: number;
  clicks: number;
  applies: number | null;
  likes: number;
}

export interface SocialAccount {
  id: number;
  platform: SocialPlatform;
  handle: string;
  profileUrl: string | null;
  status: 'connected' | 'disconnected';
  autoPublishJobs: boolean;
  trackReferrals: boolean;
  followersNum: number;
  growthPercent: number;
  impressions30d: number;
  engagementRate: number;
  jobClicks30d: number;
  applicants30d: number;
  lastSyncedAt: string | null;
  connectedAt: string;
  recentPosts: SocialPost[];
}

export interface ConnectAccountDto {
  platform: SocialPlatform;
  handle: string;
  profileUrl?: string;
  autoPublishJobs: boolean;
  trackReferrals: boolean;
}

export interface SyncAccountDto {
  followersNum: number;
  impressions30d: number;
  engagementRate: number;
  jobClicks30d: number;
  applicants30d: number;
}
