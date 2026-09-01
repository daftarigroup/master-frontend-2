import React from 'react';
import { Search, Compass } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipLoader } from 'react-spinners';
import { type ProjectItem } from '@/context/ProjectContext';
import { ProjectCard } from './ProjectCard';

interface ProjectGridProps {
    projects: ProjectItem[];
    canSelectAll: boolean;
    selectedProjectId: number | 'all' | null;
    isLocked: boolean;
    loading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSelectProject: (project: ProjectItem, element: HTMLElement) => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
    projects,
    canSelectAll,
    selectedProjectId,
    isLocked,
    loading,
    searchQuery,
    onSearchChange,
    onSelectProject,
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search Bar with isolation target */}
            {projects.length > 2 && (
                <div className="project-isolation-target max-w-md mx-auto w-full mb-3 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            placeholder="Search project name, company, or ID..."
                            value={searchQuery}
                            disabled={isLocked}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9 bg-white/80 border-white/90 text-slate-800 placeholder:text-slate-400 h-9 rounded-xl shadow-xs text-xs focus-visible:ring-blue-500"
                        />
                    </div>
                </div>
            )}

            {/* Loading Indicator */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <ClipLoader color="#2563eb" size={32} />
                    <span className="text-xs text-slate-500 font-medium">Loading permitted projects...</span>
                </div>
            ) : (
                /* Scrollable Grid */
                <div
                    className="flex-1 min-h-0 overflow-y-auto px-1 py-1 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 content-start"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {/* 1. All Projects Consolidated Scope Card */}
                    {canSelectAll && !searchQuery && (
                        <div className="project-isolation-target">
                            <ProjectCard
                                project={{ id: 'all', name: 'All Projects' }}
                                isSelected={selectedProjectId === 'all'}
                                isGlobalScope={true}
                                disabled={isLocked}
                                onSelect={onSelectProject}
                            />
                        </div>
                    )}

                    {/* 2. Individual Project Cards */}
                    {projects.map((project) => (
                        <div key={project.id} className="project-isolation-target">
                            <ProjectCard
                                project={project}
                                isSelected={selectedProjectId === project.id}
                                disabled={isLocked}
                                onSelect={onSelectProject}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && projects.length === 0 && !canSelectAll && (
                <div className="text-center py-12 bg-white/70 border border-white/80 rounded-2xl max-w-md mx-auto p-6 shadow-sm my-auto project-isolation-target">
                    <Compass className="size-8 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">No Projects Found</h3>
                    <p className="text-xs text-slate-500 mb-3">
                        {searchQuery
                            ? `No project matches "${searchQuery}".`
                            : 'You do not have any assigned projects yet. Please contact your system administrator.'}
                    </p>
                    {searchQuery && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSearchChange('')}
                            className="text-xs border-slate-300"
                        >
                            Clear Search
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
