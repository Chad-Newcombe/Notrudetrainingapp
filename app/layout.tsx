import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { AccountProvider } from "@/components/account/AccountProvider";
import { BOOT_SCRIPT, BootSplash } from "@/components/shell/BootSplash";
import { BOOT_CLOUD, BOOT_ORB, BOOT_RING } from "@/lib/brand/boot-art";
import { EdgeSwipeBack } from "@/components/shell/EdgeSwipeBack";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Not Rude Training",
  description: "Empathetic training that meets you where you are.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Not Rude Training",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const previewBuild = process.env.NOTRUDE_PREVIEW_BUILD;

  return (
    <html
      lang="en"
      data-coach="river"
      data-appearance="system"
      className={figtree.variable}
      suppressHydrationWarning // BOOT_SCRIPT adds boot-on before React hydrates
    >
      <body className="antialiased">
        <BootSplash orb={BOOT_ORB} ring={BOOT_RING} cloud={BOOT_CLOUD} />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        {previewBuild && (
          <p className="border-b-2 border-black bg-[var(--voltage)] px-3 py-1 text-center font-mono text-xs font-bold text-black">
            Not Rude Training Preview · {previewBuild}
          </p>
        )}
        <div className="app-shell">
          <AccountProvider>
            <AppThemeProvider><EdgeSwipeBack>{children}</EdgeSwipeBack></AppThemeProvider>
          </AccountProvider>
        </div>
      </body>
    </html>
  );
}
