'use client';
import { useSession, signIn, signOut } from 'next-auth/react';

export default async function DashboardPage() {
    const { data: session } = useSession();
    if (session) {
        return <div>Dashboard</div>;
    }
    return (
        <>
            Not signed in
            <br />
            <button onClick={() => signIn()}>Sign in </button>
        </>
    );
}
