import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth';
import Loading from '@/components/views/Loading';
import type { UserPermissions } from '@/types/sheets';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { loggedIn, loading } = useAuth();
    if (loading) return <Loading />;
    return loggedIn ? <>{children}</> : <Navigate to="/login" />;
}

export function GatedRoute({
    children,
    identifier,
}: {
    children: React.ReactNode;
    identifier?: keyof UserPermissions;
}) {
    const { user } = useAuth();
    if (!identifier) return <>{children}</>;

    const isAdmin = user?.administrate === true || (user?.administrate as any) === "true";
    if (isAdmin) {
        return <>{children}</>;
    }

    const hasPermission = user && ((user as any)[identifier] === true || (user as any)[identifier] === "true");
    if (!hasPermission) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
}
