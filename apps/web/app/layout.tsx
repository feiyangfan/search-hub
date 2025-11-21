// apps/web/app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Search Hub',
    description: 'Hybrid search engine for all your needs.',
    icons: {
        icon: '/icon.svg',
    },
};

type RootLayoutProps = {
    children: React.ReactNode;
    chrome?: React.ReactNode; // parallel route slot
};

export default function RootLayout({ children, chrome }: RootLayoutProps) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                {chrome}
                {children}
            </body>
        </html>
    );
}
