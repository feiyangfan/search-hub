'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';

type FieldErrors = {
    root?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
};

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [success, setSuccess] = useState<string | null>(null);
    const [isSigningUp, setIsSigningUp] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (password !== confirmPassword) {
            setFieldErrors({ confirmPassword: 'Passwords do not match' });
            setSuccess(null);
            return;
        }

        setIsSigningUp(true);
        setFieldErrors({});
        setSuccess(null);

        try {
            const res = await fetch('/api/auth/sign-up', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                let message;
                let path;
                if (res.status === 400 && data?.issues) {
                    const messages = data.issues;
                    message = messages[0].message;
                    path = messages[0].path;
                }

                if (res.status === 409) {
                    message = data.error.message;
                    path = 'email';
                }

                setFieldErrors(path ? { [path]: message } : {});

                return;
            }

            setSuccess('Account created successfully.');

            try {
                await signIn('credentials', {
                    redirect: true,
                    email,
                    password,
                    callbackUrl: '/dashboard',
                });
            } catch (error) {
                setFieldErrors({
                    root: 'Account created, but unable to sign in. Please try signing in manually.',
                });
            }
        } catch {
            setFieldErrors({
                root: 'Unable to process sign up request',
            });
        } finally {
            setIsSigningUp(false);
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center bg-gray-50 py-12">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle>Create a new Search Hub account</CardTitle>
                    <CardDescription>
                        Enter your email and password to create an account
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="example@mail.com"
                                required
                                value={email}
                                onChange={(event) => {
                                    setFieldErrors({});
                                    setEmail(event.target.value);
                                }}
                                aria-invalid={
                                    fieldErrors.email ? 'true' : 'false'
                                }
                            />
                            {fieldErrors.email ? (
                                <p className="text-sm text-red-500 m-t=1">
                                    {fieldErrors.email}
                                </p>
                            ) : null}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => {
                                    setFieldErrors({});
                                    setPassword(event.target.value);
                                }}
                                required
                                aria-invalid={
                                    fieldErrors.password ? 'true' : 'false'
                                }
                            />
                            {fieldErrors.password ? (
                                <p className="text-sm text-red-500 m-t=1">
                                    {fieldErrors.password}
                                </p>
                            ) : null}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => {
                                    setFieldErrors({});
                                    setConfirmPassword(event.target.value);
                                }}
                                required
                                aria-invalid={
                                    fieldErrors.confirmPassword
                                        ? 'true'
                                        : 'false'
                                }
                            />
                            {fieldErrors.confirmPassword ? (
                                <p className="text-sm text-red-500 m-t=1">
                                    {fieldErrors.confirmPassword}
                                </p>
                            ) : null}
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSigningUp}
                        >
                            {isSigningUp ? 'Signing Up…' : 'Sign Up'}
                        </Button>
                        {success ? (
                            <p className="text-sm  text-green-400">{success}</p>
                        ) : null}
                        {fieldErrors.root ? (
                            <p className="text-sm text-red-500 m-t=1">
                                {fieldErrors.root}
                            </p>
                        ) : null}
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <CardDescription>
                        Or use the below third party sign-in methods
                    </CardDescription>
                    {/* Placeholder for OAuth buttons */}
                </CardFooter>
            </Card>
        </div>
    );
}
