import React from 'react';
import { Layers, Building, MapPin, Briefcase, Sparkles, Check } from 'lucide-react';
import { type ProjectItem } from '@/context/ProjectContext';
import { type TransitionState } from '@/hooks/useProjectSelectionAnimation';

interface ProjectTransitionLayerProps {
    transitionState: TransitionState;
    cardRef: React.RefObject<HTMLDivElement | null>;
    surfaceRef: React.RefObject<HTMLDivElement | null>;
}

export const ProjectTransitionLayer: React.FC<ProjectTransitionLayerProps> = ({
    transitionState,
    cardRef,
    surfaceRef,
}) => {
    const { selectedProject, isLocked } = transitionState;

    if (!isLocked || !selectedProject) return null;

    const isGlobal = selectedProject.id === 'all';

    return (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {/* The Animated Card Clone */}
            <div
                ref={cardRef}
                className="bg-white/95 backdrop-blur-xl border-2 border-blue-500/90 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative box-border"
                style={{ willChange: 'transform, top, left, width, height, opacity' }}
            >
                {/* Subtle Ambient Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-purple-50/40 to-pink-50/40 pointer-events-none" />

                <div className="relative z-10">
                    {/* Header Row: Icon + Badge */}
                    <div className="flex items-start justify-between mb-2.5">
                        <div
                            className={`size-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                                isGlobal
                                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/25'
                                    : 'bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 text-slate-800 font-extrabold text-sm'
                            }`}
                        >
                            {isGlobal ? (
                                <Layers className="size-5 text-white" />
                            ) : (
                                selectedProject.name.slice(0, 2).toUpperCase()
                            )}
                        </div>

                        {isGlobal ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                Global Scope
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-medium">
                                ID: #{selectedProject.id}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 line-clamp-1">
                        {selectedProject.name}
                    </h3>

                    {/* Metadata: Company & Location */}
                    <div className="space-y-1 text-xs text-slate-600">
                        {isGlobal ? (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                View combined inventory stock, cross-firm indents, store receipts, and platform analytics across all projects.
                            </p>
                        ) : (
                            <>
                                {selectedProject.companyName && (
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Building className="size-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{selectedProject.companyName}</span>
                                    </div>
                                )}
                                {selectedProject.location ? (
                                    <div className="flex items-center gap-1.5 line-clamp-2">
                                        <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2 text-slate-500 leading-snug">
                                            {selectedProject.location}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Briefcase className="size-3.5 shrink-0" />
                                        <span>Dedicated Project Unit</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer Action / Status Indicator */}
                <div className="relative z-10 pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-blue-700 font-bold">
                        <Sparkles className="size-3 text-blue-600 animate-pulse" />
                        <span>Entering Workspace...</span>
                    </span>
                    <div className="size-2 rounded-full bg-blue-600 animate-ping" />
                </div>

                {/* Workspace Surface Reveal Overlay (Smoothly fades in during final expansion) */}
                <div
                    ref={surfaceRef}
                    className="absolute inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center opacity-0 z-20 pointer-events-none"
                >
                    <div className="text-center space-y-2">
                        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <span className="text-xs text-muted-foreground font-semibold">
                            Loading {selectedProject.name}...
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
