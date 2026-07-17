export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">FamilySherpa</h1>
        <p className="text-muted-foreground text-sm">
          L&apos;assistente che porta il carico mentale della tua famiglia
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
