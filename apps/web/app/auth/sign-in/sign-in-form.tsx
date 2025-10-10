// apps/web/app/auth/sign-in/sign-in-form.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SignInFormProps = {
    callbackUrl?: string;
};

export function SignInForm({ callbackUrl = '/dashboard' }: SignInFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
                callbackUrl,
            });

            if (!res?.ok) {
                setError('Invalid email or password.');
                return;
            }

            if (res.url) {
                window.location.href = res.url;
            }
        } catch (err) {
            setError('Unable to sign in right now. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                />
            </div>
            <div className="grid gap-2">
                <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                        href="/auth/forgot-password"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                        Forgot your password?
                    </a>
                </div>
                <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Login'}
            </Button>
        </form>
    );
}
