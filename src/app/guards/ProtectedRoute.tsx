import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import Loading from '@/components/views/Loading';
import type { UserPermissions } from '@/types/sheets';
import { hasPageAccess } from '@/components/element/PermissionGuard';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { loggedIn, loading } = useAuth();
    if (loading) return <Loading />;
    return loggedIn ? <>{children}</> : <Navigate to="/login" />;
}

export function GatedRoute({
    children,
    page,
    identifier,
    requiredMode = 'VIEW',
}: {
    children: React.ReactNode;
    page?: string;
    identifier?: keyof UserPermissions;
    requiredMode?: 'VIEW' | 'EDIT';
}) {
    const { user } = useAuth();
    if (!page && !identifier) return <>{children}</>;

    const isPermitted = hasPageAccess(user, page, requiredMode, identifier);
    if (!isPermitted) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
}
