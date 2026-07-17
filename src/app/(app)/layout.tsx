import { AppNav } from "@/components/nav/app-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full">
      <header className="border-border bg-background fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold">FamilySherpa</span>
        <button
          type="button"
          aria-label="Profilo"
          className="bg-muted size-8 rounded-full"
        />
      </header>
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 pt-14 pb-16 md:pb-4 md:pl-60">
        {children}
      </main>
    </div>
  );
}
