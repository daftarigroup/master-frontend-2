import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import Loading from '@/components/views/Loading';

export function ProjectGuard({ children }: { children: React.ReactNode }) {
    const { loggedIn, loading: authLoading } = useAuth();
    const { isProjectSelected, loadingProjects } = useProject();
    const location = useLocation();

    if (authLoading || (loggedIn && loadingProjects)) {
        return <Loading />;
    }

    if (!loggedIn) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isProjectSelected) {
        return <Navigate to="/select-project" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

export default ProjectGuard;
