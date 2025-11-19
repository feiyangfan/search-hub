import { getProviders } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
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
import { Separator } from '@/components/ui/separator';

export default async function SignInPage() {
    const session = await getServerSession(authOptions);
    if (session) {
        redirect('/dashboard');
    }
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
                <Separator />
                <CardFooter className="flex flex-col items-center justify-center">
                    <SignInButtons providers={providers} />
                </CardFooter>
            </Card>
        </div>
    );
}
