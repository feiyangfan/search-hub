export function AppSidebar() {
  return (
    <aside className="hidden md:block w-56 border-r bg-background/60">
      <nav className="p-3 space-y-1 text-sm">
        <a className="block rounded-lg px-3 py-2 hover:bg-accent" href="/search">Search</a>
        <a className="block rounded-lg px-3 py-2 hover:bg-accent" href="/upload">Upload</a>
        <a className="block rounded-lg px-3 py-2 hover:bg-accent" href="/settings">Settings</a>
      </nav>
    </aside>
  );
}
