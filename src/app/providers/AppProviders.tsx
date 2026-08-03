import React from 'react';
import { AuthProvider } from '@/core/auth';
import { SheetsProvider } from '@/context/SheetsContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SheetsProvider>
                {children}
            </SheetsProvider>
        </AuthProvider>
    );
}
