import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Menu } from 'lucide-react';
import gsap from 'gsap';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const DEFAULT_SIDEBAR_WIDTH = 264; // 16.5rem
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const COLLAPSE_THRESHOLD = 135;
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '4rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'i';

type SidebarContextProps = {
    state: 'expanded' | 'collapsed';
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
    width: number;
    setWidth: (width: number) => void;
    isDragging: boolean;
    startDragging: (e: React.MouseEvent) => void;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider.');
    }

    return context;
}

function SidebarProvider({
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
}: React.ComponentProps<'div'> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);
    const wrapperRef = React.useRef<HTMLDivElement | null>(null);

    // Dynamic width with localStorage persistence
    const [width, setWidthState] = React.useState<number>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('sidebar_custom_width');
                if (saved) {
                    const parsed = parseInt(saved, 10);
                    if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
                        return parsed;
                    }
                }
            } catch {}
        }
        return DEFAULT_SIDEBAR_WIDTH;
    });

    const [isDragging, setIsDragging] = React.useState(false);

    // Internal open state
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const currentWidthRef = React.useRef<number>(open ? width : 64);
    const isInitialMount = React.useRef(true);

    const setOpen = React.useCallback(
        (value: boolean | ((value: boolean) => boolean)) => {
            const openState = typeof value === 'function' ? value(open) : value;
            if (setOpenProp) {
                setOpenProp(openState);
            } else {
                _setOpen(openState);
            }

            // This sets the cookie to keep the sidebar state.
            document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        },
        [setOpenProp, open]
    );

    const setWidth = React.useCallback((newWidth: number) => {
        const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
        setWidthState(clamped);
        try {
            localStorage.setItem('sidebar_custom_width', clamped.toString());
        } catch {}
    }, []);

    // GSAP animation for smooth expand/collapse transition
    React.useEffect(() => {
        if (isMobile) return;
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const targetWidth = open ? width : 64;

        if (isInitialMount.current) {
            isInitialMount.current = false;
            currentWidthRef.current = targetWidth;
            wrapper.style.setProperty('--sidebar-width', `${targetWidth}px`);
            return;
        }

        if (isDragging) return;

        gsap.to(currentWidthRef, {
            current: targetWidth,
            duration: 0.28,
            ease: 'power3.out',
            onUpdate: () => {
                if (wrapper) {
                    wrapper.style.setProperty('--sidebar-width', `${currentWidthRef.current}px`);
                }
            },
            overwrite: 'auto',
        });
    }, [open, width, isDragging, isMobile]);

    // Mouse click + hold (drag) to resize, collapse, or expand the sidebar with GSAP smoothing
    const startDragging = React.useCallback(
        (startEvent: React.MouseEvent) => {
            if (isMobile) return;
            startEvent.preventDefault();
            startEvent.stopPropagation();
            setIsDragging(true);

            const startX = startEvent.clientX;
            const initialWidth = open ? width : 64;
            const wrapper = wrapperRef.current;

            const onMouseMove = (e: MouseEvent) => {
                const delta = e.clientX - startX;
                const currentWidth = initialWidth + delta;

                if (wrapper) {
                    const displayWidth = Math.max(50, Math.min(MAX_SIDEBAR_WIDTH + 40, currentWidth));
                    currentWidthRef.current = displayWidth;
                    wrapper.style.setProperty('--sidebar-width', `${displayWidth}px`);
                }

                if (currentWidth < COLLAPSE_THRESHOLD) {
                    if (open) setOpen(false);
                } else {
                    if (!open) setOpen(true);
                    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, currentWidth));
                    setWidthState(clamped);
                }
            };

            const onMouseUp = (e: MouseEvent) => {
                setIsDragging(false);
                document.body.style.removeProperty('cursor');
                document.body.style.removeProperty('user-select');
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);

                const finalDelta = e.clientX - startX;
                const finalWidth = initialWidth + finalDelta;

                if (finalWidth < COLLAPSE_THRESHOLD) {
                    setOpen(false);
                    if (wrapper) {
                        gsap.to(currentWidthRef, {
                            current: 64,
                            duration: 0.24,
                            ease: 'power3.out',
                            onUpdate: () => {
                                if (wrapper) {
                                    wrapper.style.setProperty('--sidebar-width', `${currentWidthRef.current}px`);
                                }
                            },
                        });
                    }
                } else {
                    setOpen(true);
                    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, finalWidth));
                    setWidthState(clamped);
                    try {
                        localStorage.setItem('sidebar_custom_width', clamped.toString());
                    } catch {}

                    if (wrapper) {
                        gsap.to(currentWidthRef, {
                            current: clamped,
                            duration: 0.22,
                            ease: 'power2.out',
                            onUpdate: () => {
                                if (wrapper) {
                                    wrapper.style.setProperty('--sidebar-width', `${currentWidthRef.current}px`);
                                }
                            },
                        });
                    }
                }
            };

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        },
        [isMobile, open, width, setOpen]
    );

    // Helper to toggle the sidebar with GSAP
    const toggleSidebar = React.useCallback(() => {
        return isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev);
    }, [isMobile, setOpen, setOpenMobile]);

    // Adds a keyboard shortcut to toggle the sidebar (Ctrl+I / Cmd+I).
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                (event.key.toLowerCase() === 'i' || event.key === SIDEBAR_KEYBOARD_SHORTCUT || event.key === ';')
            ) {
                event.preventDefault();
                toggleSidebar();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSidebar]);

    // Lock background page scroll position when mobile sidebar drawer is open
    React.useEffect(() => {
        if (!isMobile || !openMobile) return;

        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

        const originalStyle = {
            position: document.body.style.position,
            top: document.body.style.top,
            width: document.body.style.width,
            overflow: document.body.style.overflow,
        };

        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.position = originalStyle.position;
            document.body.style.top = originalStyle.top;
            document.body.style.width = originalStyle.width;
            document.body.style.overflow = originalStyle.overflow;
            window.scrollTo(0, scrollY);
        };
    }, [isMobile, openMobile]);

    const state = open ? 'expanded' : 'collapsed';

    const contextValue = React.useMemo<SidebarContextProps>(
        () => ({
            state,
            open,
            setOpen,
            isMobile,
            openMobile,
            setOpenMobile,
            toggleSidebar,
            width,
            setWidth,
            isDragging,
            startDragging,
            wrapperRef,
        }),
        [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, width, setWidth, isDragging, startDragging]
    );

    const dynamicSidebarWidth = `${open ? width : 64}px`;

    return (
        <SidebarContext.Provider value={contextValue}>
            <TooltipProvider delayDuration={0}>
                <div
                    ref={wrapperRef}
                    data-slot="sidebar-wrapper"
                    style={
                        {
                            '--sidebar-width': dynamicSidebarWidth,
                            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
                            ...style,
                        } as React.CSSProperties
                    }
                    className={cn(
                        'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
                        isDragging && 'select-none pointer-events-auto',
                        className
                    )}
                    {...props}
                >
                    {children}
                </div>
            </TooltipProvider>
        </SidebarContext.Provider>
    );
}

function Sidebar({
    side = 'left',
    variant = 'sidebar',
    collapsible = 'offcanvas',
    className,
    children,
    ...props
}: React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
    const { isMobile, state, openMobile, setOpenMobile, isDragging } = useSidebar();

    if (collapsible === 'none') {
        return (
            <div
                data-slot="sidebar"
                className={cn(
                    'bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }

    if (isMobile) {
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetContent
                    data-sidebar="sidebar"
                    data-slot="sidebar"
                    data-mobile="true"
                    className="bg-sidebar text-sidebar-foreground w-[280px] sm:w-[320px] max-w-[85vw] p-0 [&>button]:hidden fixed top-0 left-0 h-[100dvh] z-50 flex flex-col overflow-hidden border-r shadow-2xl"
                    style={
                        {
                            '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
                        } as React.CSSProperties
                    }
                    side={side}
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Sidebar</SheetTitle>
                        <SheetDescription>Displays the mobile sidebar.</SheetDescription>
                    </SheetHeader>
                    <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden">{children}</div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <div
            className="group peer text-sidebar-foreground hidden md:block"
            data-state={state}
            data-collapsible={state === 'collapsed' ? collapsible : ''}
            data-variant={variant}
            data-side={side}
            data-slot="sidebar"
            data-dragging={isDragging ? 'true' : 'false'}
        >
            {/* This is what handles the sidebar gap on desktop */}
            <div
                data-slot="sidebar-gap"
                className={cn(
                    'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
                    isDragging && 'transition-none duration-0',
                    'group-data-[collapsible=offcanvas]:w-0',
                    'group-data-[side=right]:rotate-180',
                    variant === 'floating' || variant === 'inset'
                        ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
                        : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
                )}
            />
            <div
                data-slot="sidebar-container"
                className={cn(
                    'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
                    isDragging && 'transition-none duration-0',
                    side === 'left'
                        ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
                        : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
                    // Adjust the padding for floating and inset variants.
                    variant === 'floating' || variant === 'inset'
                        ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
                        : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
                    className
                )}
                {...props}
            >
                <div
                    data-sidebar="sidebar"
                    data-slot="sidebar-inner"
                    className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm relative"
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
    const { toggleSidebar } = useSidebar();

    return (
        <Button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon"
            title="Toggle Sidebar (Ctrl+I)"
            className={cn('size-7', className)}
            onClick={(event) => {
                onClick?.(event);
                toggleSidebar();
            }}
            {...props}
        >
            <Menu className="text-primary"/>
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    );
}

function SidebarRail({ className, ...props }: React.ComponentProps<'div'>) {
    const { toggleSidebar, startDragging, isDragging } = useSidebar();

    return (
        <div
            data-sidebar="rail"
            data-slot="sidebar-rail"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize or toggle sidebar"
            tabIndex={-1}
            onMouseDown={startDragging}
            onDoubleClick={toggleSidebar}
            title="Click + drag to resize / collapse / expand. Double-click to toggle."
            className={cn(
                'absolute inset-y-0 -right-2 z-30 hidden w-4 cursor-col-resize select-none sm:flex items-center justify-center group/rail',
                'hover:after:bg-primary/40 after:transition-colors after:duration-150',
                'after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:w-[2px] after:bg-transparent',
                isDragging && 'after:bg-primary after:w-[3px]',
                className
            )}
            {...props}
        >
            {/* Visual Grip Handle indicator on hover/drag */}
            <div
                className={cn(
                    'z-10 w-1 h-8 rounded-full bg-slate-400/50 dark:bg-slate-500/50 opacity-0 group-hover/rail:opacity-100 group-hover/rail:scale-y-110 transition-all duration-150 shadow-xs pointer-events-none',
                    isDragging && 'opacity-100 bg-primary scale-y-125 w-1.5'
                )}
            />
        </div>
    );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
    return (
        <main
            data-slot="sidebar-inset"
            className={cn(
                'bg-background relative flex w-full flex-1 flex-col transition-all duration-300',
                'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-4',
                className
            )}
            {...props}
        />
    );
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
    return (
        <Input
            data-slot="sidebar-input"
            data-sidebar="input"
            className={cn('bg-background h-8 w-full shadow-none', className)}
            {...props}
        />
    );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sidebar-header"
            data-sidebar="header"
            className={cn('flex flex-col gap-2 p-2', className)}
            {...props}
        />
    );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sidebar-footer"
            data-sidebar="footer"
            className={cn('flex flex-col gap-2 p-2', className)}
            {...props}
        />
    );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
    return (
        <Separator
            data-slot="sidebar-separator"
            data-sidebar="separator"
            className={cn('bg-sidebar-border mx-2 w-auto', className)}
            {...props}
        />
    );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sidebar-content"
            data-sidebar="content"
            className={cn(
                'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar-thin group-data-[collapsible=icon]:scrollbar-hide',
                className
            )}
            {...props}
        />
    );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sidebar-group"
            data-sidebar="group"
            className={cn('relative flex w-full min-w-0 flex-col p-2 transition-all duration-300', className)}
            {...props}
        />
    );
}

function SidebarGroupLabel({
    className,
    asChild = false,
    ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'div';

    return (
        <Comp
            data-slot="sidebar-group-label"
            data-sidebar="group-label"
            className={cn(
                'text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
                className
            )}
            {...props}
        />
    );
}

function SidebarGroupAction({
    className,
    asChild = false,
    ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="sidebar-group-action"
            data-sidebar="group-action"
            className={cn(
                'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                // Increases the hit area of the button on mobile.
                'after:absolute after:-inset-2 md:after:hidden',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        />
    );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sidebar-group-content"
            data-sidebar="group-content"
            className={cn('w-full text-sm', className)}
            {...props}
        />
    );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
    return (
        <ul
            data-slot="sidebar-menu"
            data-sidebar="menu"
            className={cn('flex w-full min-w-0 flex-col gap-2', className)}
            {...props}
        />
    );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
    return (
        <li
            data-slot="sidebar-menu-item"
            data-sidebar="menu-item"
            className={cn('group/menu-item relative', className)}
            {...props}
        />
    );
}

const sidebarMenuButtonVariants = cva(
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-2! [&>svg]:size-4 [&>svg]:shrink-0 data-[active=true]:bg-gradient-to-br from-blue-600 to-purple-600 data-[active=true]:shadow-md',
    {
        variants: {
            variant: {
                default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                outline:
                    'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
            },
            size: {
                default: 'h-8 text-sm',
                sm: 'h-7 text-xs',
                lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

function SidebarMenuButton({
    asChild = false,
    isActive = false,
    variant = 'default',
    size = 'default',
    tooltip,
    className,
    ...props
}: React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
    const Comp = asChild ? Slot : 'button';
    const { isMobile, state } = useSidebar();

    const button = (
        <Comp
            data-slot="sidebar-menu-button"
            data-sidebar="menu-button"
            data-size={size}
            data-active={isActive}
            className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
            {...props}
        />
    );

    if (!tooltip) {
        return button;
    }

    if (typeof tooltip === 'string') {
        tooltip = {
            children: tooltip,
        };
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent
                side="right"
                align="center"
                hidden={state !== 'collapsed' || isMobile}
                {...tooltip}
            />
        </Tooltip>
    );
}

function SidebarMenuAction({
    className,
    asChild = false,
    showOnHover = false,
    ...props
}: React.ComponentProps<'button'> & {
    asChild?: boolean;
    showOnHover?: boolean;
}) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="sidebar-menu-action"
            data-sidebar="menu-action"
            className={cn(
                'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                // Increases the hit area of the button on mobile.
                'after:absolute after:-inset-2 md:after:hidden',
                'peer-data-[size=sm]/menu-button:top-1',
                'peer-data-[size=default]/menu-button:top-1.5',
                'peer-data-[size=lg]/menu-button:top-2.5',
                'group-data-[collapsible=icon]:hidden',
                showOnHover &&
                    'peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0',
                className
            )}
            {...props}
        />
    );
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sidebar-menu-badge"
            data-sidebar="menu-badge"
            className={cn(
                'text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none',
                'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
                'peer-data-[size=sm]/menu-button:top-1',
                'peer-data-[size=default]/menu-button:top-1.5',
                'peer-data-[size=lg]/menu-button:top-2.5',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        />
    );
}

function SidebarMenuSkeleton({
    className,
    showIcon = false,
    ...props
}: React.ComponentProps<'div'> & {
    showIcon?: boolean;
}) {
    // Random width between 50 to 90%.
    const width = React.useMemo(() => {
        return `${Math.floor(Math.random() * 40) + 50}%`;
    }, []);

    return (
        <div
            data-slot="sidebar-menu-skeleton"
            data-sidebar="menu-skeleton"
            className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
            {...props}
        >
            {showIcon && (
                <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
            )}
            <Skeleton
                className="h-4 max-w-(--skeleton-width) flex-1"
                data-sidebar="menu-skeleton-text"
                style={
                    {
                        '--skeleton-width': width,
                    } as React.CSSProperties
                }
            />
        </div>
    );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
    return (
        <ul
            data-slot="sidebar-menu-sub"
            data-sidebar="menu-sub"
            className={cn(
                'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        />
    );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
    return (
        <li
            data-slot="sidebar-menu-sub-item"
            data-sidebar="menu-sub-item"
            className={cn('group/menu-sub-item relative', className)}
            {...props}
        />
    );
}

function SidebarMenuSubButton({
    asChild = false,
    size = 'md',
    isActive = false,
    className,
    ...props
}: React.ComponentProps<'a'> & {
    asChild?: boolean;
    size?: 'sm' | 'md';
    isActive?: boolean;
}) {
    const Comp = asChild ? Slot : 'a';

    return (
        <Comp
            data-slot="sidebar-menu-sub-button"
            data-sidebar="menu-sub-button"
            data-size={size}
            data-active={isActive}
            className={cn(
                'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
                'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        />
    );
}

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
};
