import { getProviders, signIn } from 'next-auth/react';
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
import { SignInForm } from './sign-in-form';

export default async function SignInPage() {
    const providers = await getProviders();
    if (!providers) return null;

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
                <CardContent>
                    <SignInForm />
                </CardContent>
                <CardFooter>
                    <SignInButtons providers={providers} />
                </CardFooter>
            </Card>
        </div>
    );
}
