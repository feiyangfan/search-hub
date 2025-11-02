'use client';

import { Toaster } from 'sonner';

export function AppToaster() {
    return (
        <Toaster
            position="bottom-right"
            richColors
            offset="48px"
            visibleToasts={3}
            duration={3000}
        />
    );
}
