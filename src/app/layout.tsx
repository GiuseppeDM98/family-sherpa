import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Apply the dark palette by following the OS colour scheme, set on <html> before
// first paint so there's no flash. Done with a tiny blocking script rather than
// next-themes' <ThemeProvider>: that provider's client-component reference fails
// to resolve under `next dev --webpack` on Next 16 ("Element type is invalid…"),
// even though it builds fine for production. This has no client-component
// boundary, so it works identically in dev and prod. sonner still reads the
// theme via its own `useTheme()` (which defaults to "system").
const THEME_SCRIPT = `
try {
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var apply = function () { document.documentElement.classList.toggle('dark', mq.matches); };
  apply();
  mq.addEventListener('change', apply);
} catch (e) {}
`;

export const metadata: Metadata = {
  title: "FamilySherpa",
  description: "Il carico mentale della famiglia, gestito per te.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FamilySherpa",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
