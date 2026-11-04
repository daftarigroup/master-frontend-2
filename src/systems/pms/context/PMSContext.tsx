// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pmsApi } from '../services/pmsApiClient';
import type { PMSProject } from '../types/pms.types';

export interface PMSContextType {
  projects: PMSProject[];
  selectedProject: PMSProject | null;
  selectedProjectId: string | null;
  selectedProjectSerial: string | null;
  isProjectSelected: boolean;
  loadingProjects: boolean;
  selectProject: (project: PMSProject | null) => void;
  selectProjectById: (idOrSerial: string) => void;
  clearProject: () => void;
  refreshProjects: () => Promise<void>;
  filterRecordsByProject: <T>(
    records: T[],
    accessors?: { serialNo?: (r: T) => any; id?: (r: T) => any }
  ) => T[];
}

const STORAGE_PROJECT_KEY = 'pms_selected_project';

const PMSContext = createContext<PMSContextType | undefined>(undefined);

export const PMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<PMSProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);

  // Restore selected project from localStorage
  const [selectedProject, setSelectedProjectState] = useState<PMSProject | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PROJECT_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res: any = await pmsApi.listProjects();
      const list = res?.data || res || [];
      setProjects(list);

      // If a project was selected, sync it with fresh data from server
      setSelectedProjectState((prev) => {
        if (!prev) return null;
        const matched = list.find((p: PMSProject) => p.id === prev.id || p.serial_no === prev.serial_no);
        if (matched) {
          localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(matched));
          return matched;
        }
        return prev;
      });
    } catch (err) {
      console.error('PMS: Failed to fetch projects list', err);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects, user?.username]);

  const selectProject = useCallback((project: PMSProject | null) => {
    setSelectedProjectState(project);
    try {
      if (project) {
        localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(project));
      } else {
        localStorage.removeItem(STORAGE_PROJECT_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const selectProjectById = useCallback(
    (idOrSerial: string) => {
      const match = projects.find((p) => p.id === idOrSerial || p.serial_no === idOrSerial);
      if (match) {
        selectProject(match);
      }
    },
    [projects, selectProject]
  );

  const clearProject = useCallback(() => {
    selectProject(null);
  }, [selectProject]);

  const selectedProjectId = selectedProject ? selectedProject.id : null;
  const selectedProjectSerial = selectedProject ? selectedProject.serial_no : null;
  const isProjectSelected = Boolean(selectedProject);

  const filterRecordsByProject = useCallback(
    <T,>(records: T[], accessors?: { serialNo?: (r: T) => any; id?: (r: T) => any }): T[] => {
      if (!selectedProject || !Array.isArray(records)) return records;

      return records.filter((r: any) => {
        const itemSerial = accessors?.serialNo
          ? accessors.serialNo(r)
          : r.project_no || r.projectNo || r.serialNo || r.serial_no;
        const itemId = accessors?.id ? accessors.id(r) : r.project_id || r.projectId;

        if (itemSerial && itemSerial === selectedProject.serial_no) return true;
        if (itemId && String(itemId) === String(selectedProject.id)) return true;
        return false;
      });
    },
    [selectedProject]
  );

  const value = useMemo(
    () => ({
      projects,
      selectedProject,
      selectedProjectId,
      selectedProjectSerial,
      isProjectSelected,
      loadingProjects,
      selectProject,
      selectProjectById,
      clearProject,
      refreshProjects,
      filterRecordsByProject,
    }),
    [
      projects,
      selectedProject,
      selectedProjectId,
      selectedProjectSerial,
      isProjectSelected,
      loadingProjects,
      selectProject,
      selectProjectById,
      clearProject,
      refreshProjects,
      filterRecordsByProject,
    ]
  );

  return <PMSContext.Provider value={value}>{children}</PMSContext.Provider>;
};

export const usePMS = (): PMSContextType => {
  const context = useContext(PMSContext);
  if (!context) {
    throw new Error('usePMS must be used within a PMSProvider');
  }
  return context;
};
