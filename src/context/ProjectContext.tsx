import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { fetchMasterOptions } from '@/services/masterService';
import { filterByFirmAccess } from '@/lib/firmAccess';

export type WorkspaceMode = 'PROJECT' | 'GLOBAL';

export interface ProjectItem {
    id: number | 'all';
    name: string;
    code?: string;
    companyName?: string;
    location?: string;
    destinationAddress?: string;
}

export interface ActiveWorkspace {
    mode: WorkspaceMode;
    projectId: number | null;
    project: ProjectItem | null;
}

interface ProjectContextType {
    activeWorkspace: ActiveWorkspace | null;
    selectedProject: ProjectItem | null;
    selectedProjectId: number | 'all' | null;
    selectedProjectName: string;
    effectivePermittedFirms: string[] | undefined;
    isProjectSelected: boolean;
    isAllProjects: boolean;
    availableProjects: ProjectItem[];
    loadingProjects: boolean;
    selectProject: (project: ProjectItem) => void;
    clearProject: () => void;
    matchesProject: (firmName?: string, firmId?: any) => boolean;
    filterRecordsByActiveProject: <T>(
        records: T[],
        accessors?: { id?: (r: T) => any; name?: (r: T) => any }
    ) => T[];
    refreshProjects: () => Promise<void>;
}

const STORAGE_ID_KEY = 'active_project_id';
const STORAGE_NAME_KEY = 'active_project_name';

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loggedIn, loading: authLoading } = useAuth();
    const [availableProjects, setAvailableProjects] = useState<ProjectItem[]>([]);
    const [loadingProjects, setLoadingProjects] = useState<boolean>(true);

    // Initialize from localStorage if valid
    const [selectedProject, setSelectedProjectState] = useState<ProjectItem | null>(() => {
        try {
            const storedId = localStorage.getItem(STORAGE_ID_KEY);
            const storedName = localStorage.getItem(STORAGE_NAME_KEY);
            if (storedId && storedName) {
                return {
                    id: storedId === 'all' ? 'all' : Number(storedId),
                    name: storedName,
                };
            }
        } catch {
            // ignore localStorage errors
        }
        return null;
    });

    const isAllProjects = selectedProject?.id === 'all';
    const isProjectSelected = selectedProject !== null;
    const selectedProjectId = selectedProject?.id ?? null;
    const selectedProjectName = selectedProject?.name ?? 'All';

    // Structured active workspace representation
    const activeWorkspace: ActiveWorkspace | null = useMemo(() => {
        if (!selectedProject) return null;
        if (selectedProject.id === 'all') {
            return {
                mode: 'GLOBAL',
                projectId: null,
                project: selectedProject,
            };
        }
        return {
            mode: 'PROJECT',
            projectId: Number(selectedProject.id),
            project: selectedProject,
        };
    }, [selectedProject]);

    // Compute effective permitted firms for filtering based on active project
    const effectivePermittedFirms = useMemo(() => {
        const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.administrate === true;
        if (!selectedProject || selectedProject.id === 'all') {
            if (isAdmin) return undefined;
            return user?.firm_access && user.firm_access.length > 0 ? user.firm_access : [];
        }

        const selectedIdStr = String(selectedProject.id);
        if (!isAdmin && user?.firm_access && user.firm_access.length > 0) {
            const hasAccess = user.firm_access.some(
                (f) => String(f).trim() === selectedIdStr || String(f).trim().toLowerCase() === selectedProject.name.trim().toLowerCase()
            );
            if (!hasAccess) return [];
        }
        return [selectedIdStr];
    }, [user, selectedProject]);

    // Fetch permitted projects for current user
    const refreshProjects = useCallback(async () => {
        if (!loggedIn) {
            setAvailableProjects([]);
            setLoadingProjects(false);
            return;
        }

        setLoadingProjects(true);
        try {
            const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.administrate === true;
            const permittedFirms = isAdmin ? undefined : (user?.firm_access && user.firm_access.length > 0 ? user.firm_access : ['__NONE__']);

            const masterOptions = await fetchMasterOptions(permittedFirms);
            const firmObjs = masterOptions.firmObjects || [];
            const companyMap = masterOptions.firmCompanyMap || {};

            const list: ProjectItem[] = firmObjs.map((f: { id: number; name: string }) => {
                const comp = companyMap[f.name] || {};
                return {
                    id: f.id,
                    name: f.name,
                    companyName: comp.companyName || '',
                    location: comp.destinationAddress || comp.companyAddress || '',
                };
            });

            setAvailableProjects(list);
        } catch (error) {
            console.error('Error fetching available projects:', error);
        } finally {
            setLoadingProjects(false);
        }
    }, [user, loggedIn]);

    useEffect(() => {
        if (authLoading) return;

        if (loggedIn) {
            refreshProjects();
        } else {
            // Clear selection only when definitely logged out
            setSelectedProjectState(null);
            try {
                localStorage.removeItem(STORAGE_ID_KEY);
                localStorage.removeItem(STORAGE_NAME_KEY);
            } catch {
                // ignore
            }
        }
    }, [authLoading, loggedIn, refreshProjects]);

    const selectProject = useCallback((project: ProjectItem) => {
        setSelectedProjectState(project);
        try {
            localStorage.setItem(STORAGE_ID_KEY, String(project.id));
            localStorage.setItem(STORAGE_NAME_KEY, project.name);
        } catch (e) {
            console.error('Failed to save selected project to localStorage:', e);
        }
    }, []);

    const clearProject = useCallback(() => {
        setSelectedProjectState(null);
        try {
            localStorage.removeItem(STORAGE_ID_KEY);
            localStorage.removeItem(STORAGE_NAME_KEY);
        } catch {
            // ignore
        }
    }, []);

    // Helper to test if a record matches currently selected project
    const matchesProject = useCallback(
        (firmName?: string, firmId?: any): boolean => {
            if (!selectedProject || selectedProject.id === 'all') return true;

            // Check firmId match
            if (firmId !== undefined && firmId !== null && firmId !== '') {
                if (String(firmId) === String(selectedProject.id)) return true;
            }

            // Check firmName match
            if (firmName && firmName.trim().toLowerCase() === selectedProject.name.trim().toLowerCase()) {
                return true;
            }

            return false;
        },
        [selectedProject]
    );

    // Generic filtering utility for any array of records
    const filterRecordsByActiveProject = useCallback(
        <T,>(records: T[], accessors?: { id?: (r: T) => any; name?: (r: T) => any }): T[] => {
            return filterByFirmAccess(records, effectivePermittedFirms, accessors);
        },
        [effectivePermittedFirms]
    );

    const value = useMemo(
        () => ({
            activeWorkspace,
            selectedProject,
            selectedProjectId,
            selectedProjectName,
            effectivePermittedFirms,
            isProjectSelected,
            isAllProjects,
            availableProjects,
            loadingProjects,
            selectProject,
            clearProject,
            matchesProject,
            filterRecordsByActiveProject,
            refreshProjects,
        }),
        [
            activeWorkspace,
            selectedProject,
            selectedProjectId,
            selectedProjectName,
            effectivePermittedFirms,
            isProjectSelected,
            isAllProjects,
            availableProjects,
            loadingProjects,
            selectProject,
            clearProject,
            matchesProject,
            filterRecordsByActiveProject,
            refreshProjects,
        ]
    );

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};
