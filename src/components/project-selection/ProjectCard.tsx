import React from 'react';
import { Layers, ArrowRight, Building, MapPin, Briefcase, Check } from 'lucide-react';
import { type ProjectItem } from '@/context/ProjectContext';

interface ProjectCardProps {
    project: ProjectItem;
    isSelected: boolean;
    isGlobalScope?: boolean;
    disabled?: boolean;
    onSelect: (project: ProjectItem, element: HTMLElement) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
    project,
    isSelected,
    isGlobalScope = false,
    disabled = false,
    onSelect,
}) => {
    const cardRef = React.useRef<HTMLDivElement>(null);

    const handleClick = () => {
        if (disabled || !cardRef.current) return;
        onSelect(project, cardRef.current);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (cardRef.current) {
                onSelect(project, cardRef.current);
            }
        }
    };

    if (isGlobalScope) {
        return (
            <div
                ref={cardRef}
                id="project-card-all"
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label="Select All Projects Consolidated Overview"
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                className={`project-card-item group relative cursor-pointer select-none rounded-2xl p-4 sm:p-5 transition-all duration-200 border bg-white/80 hover:bg-white/95 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/80 shadow-md'
                        : 'border-blue-200/80 shadow-xs hover:border-blue-400'
                } ${disabled ? 'pointer-events-none opacity-80' : ''}`}
            >
                <div>
                    <div className="flex items-start justify-between mb-3">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                            <Layers className="size-5 text-white" />
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                            Global Scope
                        </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                        All Projects (Consolidated)
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        View combined inventory stock, cross-firm indents, store receipts, and platform analytics across all projects.
                    </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                    <span>Access All Workspaces</span>
                    <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        );
    }

    return (
        <div
            ref={cardRef}
            id={`project-card-${project.id}`}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Select Project ${project.name}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`project-card-item group relative cursor-pointer select-none rounded-2xl p-4 sm:p-5 transition-all duration-200 border bg-white/80 hover:bg-white/95 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/70 shadow-md'
                    : 'border-white/90 shadow-xs hover:border-blue-300'
            } ${disabled ? 'pointer-events-none opacity-80' : ''}`}
        >
            <div>
                <div className="flex items-start justify-between mb-3">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/80 flex items-center justify-center text-slate-800 font-extrabold text-sm shadow-xs group-hover:border-blue-400 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                        {project.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono font-medium">
                        ID: #{project.id}
                    </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {project.name}
                </h3>

                <div className="space-y-1 text-xs text-slate-500">
                    {project.companyName ? (
                        <div className="flex items-center gap-1.5 truncate">
                            <Building className="size-3 text-slate-400 shrink-0" />
                            <span className="truncate">{project.companyName}</span>
                        </div>
                    ) : null}
                    {project.location ? (
                        <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="size-3 text-slate-400 shrink-0" />
                            <span className="truncate">{project.location}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <Briefcase className="size-3 shrink-0" />
                            <span>Dedicated Project Unit</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-blue-600">
                <span className="flex items-center gap-1">
                    {isSelected ? (
                        <>
                            <Check className="size-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Selected</span>
                        </>
                    ) : (
                        'Open Workspace'
                    )}
                </span>
                <ArrowRight className="size-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
        </div>
    );
};
