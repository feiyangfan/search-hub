import { getProviders } from 'next-auth/react';
import { SignInButtons } from './sign-in-buttons';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardAction,
    CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function SignInPage() {
    const providers = await getProviders();
    if (!providers) return null;

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
    }
    return (
        <div className="flex flex-1 items-center justify-center bg-gray-50 py-12">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle>Login to your Search Hub account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                    <CardAction>
                        <Button variant="link">
                            <a href="/auth/sign-up">Sign up</a>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <form>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="example@mail.com"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                                <a
                                    href="#"
                                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                >
                                    Forgot your password?
                                </a>
                            </div>
                            <Input id="password" type="password" required />
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="submit" className="w-full">
                        Login
                    </Button>
                    <SignInButtons providers={providers} />
                </CardFooter>
            </Card>
        </div>
    );
}
