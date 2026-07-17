import Link from "next/link";
import { auth } from "@/auth";
import { AppNav } from "@/components/nav/app-nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="min-h-full">
      <header className="border-border bg-background fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold">FamilySherpa</span>
        <Link href="/settings" aria-label="Profilo">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- user avatar URL, not worth next/image config for a 32px icon
            <img src={user.image} alt="" className="size-8 rounded-full" />
          ) : (
            <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-sm font-medium">
              {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
      </header>
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 pt-14 pb-16 md:pb-4 md:pl-60">
        {children}
      </main>
    </div>
  );
}
