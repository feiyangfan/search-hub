export default function NotFoundPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 text-center">
            <div className="max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    404
                </p>
                <h1 className="text-3xl font-bold">Page not found</h1>
                <p className="text-sm text-muted-foreground">
                    The page you are looking for doesn&apos;t exist or has been
                    moved. Check the URL or return home.
                </p>
                <a
                    href="/"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                    Go back home
                </a>
            </div>
        </div>
    );
}
