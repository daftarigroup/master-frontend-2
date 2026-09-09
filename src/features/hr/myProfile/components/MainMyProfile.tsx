'use client';

import {
  IconAlertCircle,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconId,
  IconLoader2,
  IconMail,
  IconPhone,
  IconShield,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useGetProfileQuery } from '@/features/profile/shared/server/tanstackQuery/useProfileQueries';

const MainMyProfile = () => {
  const { data, isLoading, error } = useGetProfileQuery();

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-20">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8">
          <IconAlertCircle className="h-8 w-8 text-red-600" />
          <p className="text-red-800">Failed to load profile</p>
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const user = data?.success ? data.data : null;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl py-20">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-8">
          <IconUser className="h-8 w-8 text-gray-400" />
          <p className="text-gray-600">No profile data available</p>
        </div>
      </div>
    );
  }

  // Get user display name (name or email fallback)
  const displayName = user.name || user.fullName || user.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // Format dates - handles both string and Date objects from API
  // This function safely handles all date formats and prevents errors
  const formatDate = (date: any): string => {
    // Handle null, undefined, or empty values
    if (!date) return 'N/A';

    try {
      // Force conversion to Date object
      let dateObj: Date;

      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        // For any other type, convert to string first
        dateObj = new Date(String(date));
      }

      // Double-check we have a Date instance
      if (!(dateObj instanceof Date)) {
        return 'Invalid Date';
      }

      // Check if date is valid
      const timestamp = dateObj.getTime();
      if (Number.isNaN(timestamp)) {
        return 'Invalid Date';
      }

      // Safely call toLocaleDateString with error handling
      try {
        const formatted = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        return formatted || 'Invalid Date';
      } catch (_formatError) {
        // Fallback to manual formatting if toLocaleDateString fails
        const year = dateObj.getFullYear();
        const month = dateObj.toLocaleString('en-US', { month: 'long' });
        const day = dateObj.getDate();
        return `${month} ${day}, ${year}`;
      }
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', date, 'Type:', typeof date);
      return 'Invalid Date';
    }
  };

  const formatDateTime = (date: any): string => {
    // Handle null, undefined, or empty values
    if (!date) return 'N/A';

    try {
      // Force conversion to Date object
      let dateObj: Date;

      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        // For any other type, convert to string first
        dateObj = new Date(String(date));
      }

      // Double-check we have a Date instance
      if (!(dateObj instanceof Date)) {
        return 'Invalid Date';
      }

      // Check if date is valid
      const timestamp = dateObj.getTime();
      if (Number.isNaN(timestamp)) {
        return 'Invalid Date';
      }

      // Safely call toLocaleString with error handling
      try {
        const formatted = dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return formatted || 'Invalid Date';
      } catch (_formatError) {
        // Fallback to manual formatting if toLocaleString fails
        const year = dateObj.getFullYear();
        const month = dateObj.toLocaleString('en-US', { month: 'short' });
        const day = dateObj.getDate();
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        return `${month} ${day}, ${year} ${hours}:${minutes}`;
      }
    } catch (error) {
      console.error('Error formatting date time:', error, 'Input:', date, 'Type:', typeof date);
      return 'Invalid Date';
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="h-32 bg-linear-to-r from-blue-500 to-indigo-600"></div>
        <div className="px-4 pb-8 sm:px-8">
          <div className="relative -mt-12 mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4 sm:gap-6">
              <div className="h-20 w-20 shrink-0 rounded-2xl bg-white p-1 shadow-lg sm:h-24 sm:w-24">
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white sm:text-3xl">
                  {initial}
                </div>
              </div>
              <div className="mb-2 min-w-0">
                <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">
                  {displayName}
                </h1>
                <p className="text-sm font-medium text-gray-500 capitalize">
                  {user.role || 'User'}
                </p>
              </div>
            </div>
            <button className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 sm:mb-2">
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Personal Information */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-base font-semibold text-gray-800 sm:text-lg">
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <IconMail className="h-5 w-5 shrink-0 text-gray-400" />
                    <span className="break-all">{user.email}</span>
                  </div>

                  {user.mobile && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconPhone className="h-5 w-5 shrink-0 text-gray-400" />
                      <span>{user.mobile}</span>
                    </div>
                  )}

                  {user.id && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconUser className="h-5 w-5 shrink-0 text-gray-400" />
                      <span className="min-w-0 break-all font-mono text-sm">{user.id}</span>
                    </div>
                  )}

                  {user.employeeId && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconId className="h-5 w-5 shrink-0 text-gray-400" />
                      <span>{user.employeeId}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-gray-600">
                    <IconShield className="h-5 w-5 shrink-0 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <span>Email Verified:</span>
                      {user.isEmailVerified ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <IconCheck className="h-4 w-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <IconX className="h-4 w-4" />
                          Not Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-base font-semibold text-gray-800 sm:text-lg">
                  Work Information
                </h3>
                <div className="space-y-4">
                  {user.role && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconShield className="h-5 w-5 shrink-0 text-gray-400" />
                      <span className="capitalize">{user.role}</span>
                    </div>
                  )}

                  {user.tenantId && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconBuilding className="h-5 w-5 shrink-0 text-gray-400" />
                      <span className="min-w-0 break-all font-mono text-sm">{user.tenantId}</span>
                    </div>
                  )}

                  {user.companyName && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconBuilding className="h-5 w-5 shrink-0 text-gray-400" />
                      <span>{user.companyName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-gray-600">
                    <IconShield className="h-5 w-5 shrink-0 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      {user.isActive !== undefined && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                      {user.status && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 capitalize">
                          {user.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-base font-semibold text-gray-800 sm:text-lg">
                  Account Information
                </h3>
                <div className="space-y-4">
                  {user.createdAt && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconCalendar className="h-5 w-5 shrink-0 text-gray-400" />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Created</span>
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                    </div>
                  )}

                  {user.updatedAt && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconClock className="h-5 w-5 shrink-0 text-gray-400" />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Last Updated</span>
                        <span>{formatDateTime(user.updatedAt)}</span>
                      </div>
                    </div>
                  )}

                  {user.createdByAdminId && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <IconUser className="h-5 w-5 shrink-0 text-gray-400" />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm text-gray-500">Created By Admin</span>
                        <span className="break-all font-mono text-sm">{user.createdByAdminId}</span>
                      </div>
                    </div>
                  )}

                  {user.deletedAt && (
                    <div className="flex items-center gap-3 text-red-600">
                      <IconX className="h-5 w-5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm">Deleted At</span>
                        <span>{formatDateTime(user.deletedAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMyProfile;
