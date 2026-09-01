import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProject, type ProjectItem } from '@/context/ProjectContext';
import { Shield, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/element/Logo';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ProjectGrid } from '../project-selection/ProjectGrid';
import { ProjectTransitionLayer } from '../project-selection/ProjectTransitionLayer';
import { useProjectSelectionAnimation } from '@/hooks/useProjectSelectionAnimation';

export const SelectProject: React.FC = () => {
    const { user, logout } = useAuth();
    const { availableProjects, loadingProjects, selectProject, selectedProjectId } = useProject();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Final navigation callback after animation completes
    const handleAnimationComplete = useCallback(
        (project: ProjectItem) => {
            selectProject(project);
            navigate('/dashboard', { replace: true });
        },
        [selectProject, navigate]
    );

    // Custom GSAP transition orchestration hook
    const {
        transitionState,
        triggerSelection,
        transitionLayerCardRef,
        transitionSurfaceRef,
    } = useProjectSelectionAnimation({
        onComplete: handleAnimationComplete,
        containerRef,
    });

    // Determine if user can see "All Projects"
    const canSelectAll = useMemo(() => {
        if (!user) return false;
        if (user.administrate || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
        if (!user.firm_access || user.firm_access.length === 0 || user.firm_access.length > 1) return true;
        return false;
    }, [user]);

    // Filter projects by search
    const filteredProjects = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return availableProjects;
        return availableProjects.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                (p.companyName && p.companyName.toLowerCase().includes(query)) ||
                (p.location && p.location.toLowerCase().includes(query)) ||
                String(p.id).includes(query)
        );
    }, [availableProjects, searchQuery]);

    // GSAP Entrance & Ambient Animations
    useGSAP(
        () => {
            // Floating background blobs animation (matching Login page)
            const blobs = gsap.utils.toArray<HTMLElement>('.select-blob', containerRef.current);
            blobs.forEach((blob, i) => {
                gsap.to(blob, {
                    x: i % 2 === 0 ? 35 : -35,
                    y: i % 2 === 0 ? -25 : 25,
                    duration: 8 + i * 1.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                });
            });

            if (loadingProjects) return;

            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.fromTo(
                '.project-page-header',
                { y: -20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6 }
            )
                .fromTo(
                    '.project-page-intro',
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.5 },
                    '-=0.35'
                )
                .fromTo(
                    '.project-card-item',
                    { y: 30, opacity: 0, scale: 0.95 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.45,
                        stagger: 0.04,
                        ease: 'back.out(1.15)',
                    },
                    '-=0.25'
                );
        },
        { scope: containerRef, dependencies: [loadingProjects] }
    );

    return (
        <div
            ref={containerRef}
            className="h-screen max-h-screen w-full bg-gradient-to-br from-blue-100 via-purple-50 to-pink-50 text-slate-800 flex flex-col relative overflow-hidden select-none"
        >
            {/* Ambient Background Floating Blobs */}
            <div className="select-blob absolute -top-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-blue-300 to-purple-300 blur-3xl opacity-60 pointer-events-none" />
            <div className="select-blob absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-purple-300 to-fuchsia-300 blur-3xl opacity-50 pointer-events-none" />
            <div className="select-blob absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300 to-blue-200 blur-3xl opacity-50 pointer-events-none" />

            {/* Top Navigation Bar */}
            <header className="project-page-header project-isolation-target relative z-10 border-b border-white/60 bg-white/70 backdrop-blur-md px-6 py-2.5 flex items-center justify-between shadow-xs shrink-0">
                <div className="flex items-center gap-3">
                    <Logo className="size-7" />
                    <div>
                        <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            Master ERP Platform
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-200 text-blue-700 bg-blue-50">
                                Project Guard
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-semibold text-slate-800">{user?.name || user?.username}</div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                            <Shield className="size-3 text-emerald-600" />
                            {user?.role || (user?.administrate ? 'Administrator' : 'Authorized User')}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={transitionState.isLocked}
                        onClick={logout}
                        className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 h-8 gap-1.5 text-xs"
                    >
                        <LogOut className="size-3.5" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </header>

            {/* Main Viewport-Fitted Container */}
            <main className="relative z-10 flex-1 flex flex-col min-h-0 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 overflow-hidden">
                {/* Intro Title Section */}
                <div className="project-page-intro project-isolation-target text-center max-w-xl mx-auto mb-3.5 space-y-1.5 shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 text-[11px] font-semibold">
                        <Sparkles className="size-3 text-blue-600 animate-pulse" />
                        Select Workspace Context
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                        Choose Active Project
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-1">
                        Select a project to filter and scope all stages, inventory, and procurement records.
                    </p>
                </div>

                {/* Modular Project Grid */}
                <ProjectGrid
                    projects={filteredProjects}
                    canSelectAll={canSelectAll}
                    selectedProjectId={selectedProjectId}
                    isLocked={transitionState.isLocked}
                    loading={loadingProjects}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSelectProject={triggerSelection}
                />
            </main>

            {/* Fixed Animated Transition Overlay Layer */}
            <ProjectTransitionLayer
                transitionState={transitionState}
                cardRef={transitionLayerCardRef}
                surfaceRef={transitionSurfaceRef}
            />

            {/* Compact Footer */}
            <footer className="project-isolation-target relative z-10 py-2 text-center text-[10px] text-slate-500 border-t border-white/50 bg-white/40 backdrop-blur-xs shrink-0">
                Master ERP System • Enterprise Project-Scoped Operations
            </footer>
        </div>
    );
};

export default SelectProject;
