import { useState, useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { type ProjectItem } from '@/context/ProjectContext';

export type AnimationStage =
    | 'idle'
    | 'isolating'
    | 'centering'
    | 'focus'
    | 'expanding'
    | 'navigating';

export interface TransitionState {
    stage: AnimationStage;
    isLocked: boolean;
    selectedProject: ProjectItem | null;
    initialRect: DOMRect | null;
}

interface UseProjectSelectionAnimationProps {
    onComplete: (project: ProjectItem) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useProjectSelectionAnimation({
    onComplete,
    containerRef,
}: UseProjectSelectionAnimationProps) {
    const [transitionState, setTransitionState] = useState<TransitionState>({
        stage: 'idle',
        isLocked: false,
        selectedProject: null,
        initialRect: null,
    });

    const activeTimelineRef = useRef<gsap.core.Timeline | null>(null);
    const transitionLayerCardRef = useRef<HTMLDivElement | null>(null);
    const transitionSurfaceRef = useRef<HTMLDivElement | null>(null);

    // Check for prefers-reduced-motion preference
    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Cleanup active timelines on unmount
    useEffect(() => {
        return () => {
            if (activeTimelineRef.current) {
                activeTimelineRef.current.kill();
                activeTimelineRef.current = null;
            }
        };
    }, []);

    const triggerSelection = useCallback(
        (project: ProjectItem, sourceElement: HTMLElement) => {
            if (transitionState.isLocked) return;

            const rect = sourceElement.getBoundingClientRect();

            setTransitionState({
                stage: 'isolating',
                isLocked: true,
                selectedProject: project,
                initialRect: rect,
            });

            // Fast path for reduced motion
            if (prefersReducedMotion) {
                gsap.to(containerRef.current, {
                    opacity: 0,
                    duration: 0.2,
                    onComplete: () => {
                        onComplete(project);
                    },
                });
                return;
            }

            // Execute next animation frame so transition card element is mounted with exact rect
            requestAnimationFrame(() => {
                const cardEl = transitionLayerCardRef.current;
                const surfaceEl = transitionSurfaceRef.current;
                const isolationTargets = containerRef.current?.querySelectorAll(
                    '.project-isolation-target'
                );

                if (!cardEl || !surfaceEl) {
                    onComplete(project);
                    return;
                }

                // Initial positioning of transition clone card at exact source element rect
                gsap.set(cardEl, {
                    position: 'fixed',
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    opacity: 1,
                    scale: 1,
                    zIndex: 100,
                    transformOrigin: 'center center',
                });

                gsap.set(surfaceEl, {
                    opacity: 0,
                    scale: 0.98,
                });

                // Compute destination viewport center coordinates preserving natural card aspect ratio
                const viewportW = window.innerWidth;
                const viewportH = window.innerHeight;
                const targetW = Math.min(Math.max(rect.width, 360), viewportW * 0.9);
                const targetH = Math.min(Math.max(rect.height, 200), viewportH * 0.7);
                const targetLeft = (viewportW - targetW) / 2;
                const targetTop = (viewportH - targetH) / 2;

                const tl = gsap.timeline({
                    onComplete: () => {
                        setTransitionState((prev) => ({ ...prev, stage: 'navigating' }));
                        onComplete(project);
                    },
                });

                activeTimelineRef.current = tl;

                // Stage 1: Element Isolation (Fade out non-selected elements)
                if (isolationTargets && isolationTargets.length > 0) {
                    tl.to(
                        isolationTargets,
                        {
                            opacity: 0,
                            scale: 0.95,
                            y: 10,
                            duration: 0.35,
                            ease: 'power2.inOut',
                            stagger: 0.015,
                        },
                        0
                    );
                }

                // Stage 2: Move Selected Card from Grid to Center
                tl.to(
                    cardEl,
                    {
                        top: targetTop,
                        left: targetLeft,
                        width: targetW,
                        height: targetH,
                        borderRadius: '20px',
                        boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.35)',
                        borderColor: '#2563eb',
                        duration: 0.52,
                        ease: 'power3.inOut',
                    },
                    0.04
                );

                // Stage 3: Focus Moment (Subtle scale pulse at center)
                tl.to(cardEl, {
                    scale: 1.05,
                    duration: 0.22,
                    ease: 'sine.inOut',
                    yoyo: true,
                    repeat: 1,
                });

                // Stage 4: Fullscreen Expansion (Zoom & Morph into Application Surface)
                tl.to(
                    cardEl,
                    {
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        borderRadius: '0px',
                        duration: 0.42,
                        ease: 'power3.in',
                    },
                    '+=0.04'
                ).to(
                    surfaceEl,
                    {
                        opacity: 1,
                        scale: 1,
                        duration: 0.32,
                        ease: 'power2.out',
                    },
                    '-=0.28'
                );
            });
        },
        [containerRef, onComplete, prefersReducedMotion, transitionState.isLocked]
    );

    return {
        transitionState,
        triggerSelection,
        transitionLayerCardRef,
        transitionSurfaceRef,
    };
}
