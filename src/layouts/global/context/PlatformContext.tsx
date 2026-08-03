import React, { createContext, useContext, useState } from 'react';

interface PlatformContextType {
  activeSystemId: string;
  setActiveSystemId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

const PlatformContext = createContext<PlatformContextType | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSystemId, setActiveSystemId] = useState<string>('store');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  return (
    <PlatformContext.Provider value={{ activeSystemId, setActiveSystemId, searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen }}>
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
