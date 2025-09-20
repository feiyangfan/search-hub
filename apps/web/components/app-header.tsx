// apps/web/components/app-header.tsx
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
const showStatus = process.env.NEXT_PUBLIC_SHOW_STATUS === "true";
export function AppHeader() {
  return (
    <div className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">Search Hub</Link>
        <nav className="flex items-center gap-3 text-sm">
          {/* your other nav links */}
          
            <Link
              href="/health"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Status
            </Link>
          
        </nav>
      </div>
      <Separator />
    </div>
  );
}
