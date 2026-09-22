import React, { createContext, useContext, useState } from 'react';

const LAST_ACTIVE_SYSTEM_KEY = 'platform:lastActiveSystemId';

interface PlatformContextType {
    activeSystemId: string;
    setActiveSystemId: (id: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSearchOpen: boolean;
    setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isLauncherOpen: boolean;
    setIsLauncherOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PlatformContext = createContext<PlatformContextType | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeSystemId, setActiveSystemIdState] = useState<string>(
        () => localStorage.getItem(LAST_ACTIVE_SYSTEM_KEY) || 'store'
    );
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
    const [isLauncherOpen, setIsLauncherOpen] = useState<boolean>(false);

    const setActiveSystemId = (id: string) => {
        setActiveSystemIdState(id);
        localStorage.setItem(LAST_ACTIVE_SYSTEM_KEY, id);
    };

    return (
        <PlatformContext.Provider
            value={{
                activeSystemId,
                setActiveSystemId,
                searchQuery,
                setSearchQuery,
                isSearchOpen,
                setIsSearchOpen,
                isLauncherOpen,
                setIsLauncherOpen,
            }}
        >
            {children}
        </PlatformContext.Provider>
    );
};

export const usePlatform = () => {
    const context = useContext(PlatformContext);
    if (!context) {
        throw new Error('usePlatform must be used within a PlatformProvider');
    }
    return context;
};
