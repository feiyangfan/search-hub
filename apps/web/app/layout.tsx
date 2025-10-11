import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/app-header';
import { AppToaster } from '@/components/app-toaster';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Search Hub',
    description: 'Hybird search engine for all your needs.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <div className="flex min-h-dvh flex-col">
                    <AppHeader />
                    <main className="flex flex-1 flex-col">{children}</main>
                    {/* <AppFooter /> */}
                </div>
                <AppToaster />
            </body>
        </html>
    );
}
