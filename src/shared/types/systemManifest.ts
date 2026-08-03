import React from 'react';

export interface SystemNavItem {
  id: string;
  name: string;
  path: string;
  icon?: React.ReactNode;
  gateKey?: string;
  hidden?: boolean;
  badgeCount?: (contextData?: any, user?: any) => number;
}

export interface SystemNavGroup {
  id: string;
  title: string;
  icon?: React.ReactNode;
  items: SystemNavItem[];
  gateKey?: string;
}

export interface SystemManifest {
  id: string;
  name: string;
  description?: string;
  version?: string;
  iconName: string;
  themeColor?: string;
  basePath: string;
  defaultRoute: string;
  gateKey?: string;
  navGroups: SystemNavGroup[];
  notificationResolver?: (user?: any) => number;
}
