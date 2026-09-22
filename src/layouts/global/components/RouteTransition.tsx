import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * "Window focus" transition for the main content canvas (OS-shell redesign,
 * Direction 3): each route change gets a short scale+fade rather than an
 * instant swap, echoing how a window animates when it gains focus. Purely
 * visual chrome — does not affect data density or layout of the page itself.
 */
export const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            if (!containerRef.current) return;
            gsap.killTweensOf(containerRef.current);

            gsap.fromTo(
                containerRef.current,
                { autoAlpha: 0.2, y: 4 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.15,
                    ease: 'power1.out',
                    force3D: true,
                    overwrite: 'auto',
                    clearProps: 'transform,opacity,visibility',
                }
            );
        },
        { dependencies: [location.pathname], scope: containerRef, revertOnUpdate: true }
    );

    return (
        <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
            {children}
        </div>
    );
};

export default RouteTransition;
