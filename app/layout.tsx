import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Figtree } from "next/font/google";
import "./globals.css";
import { AccountProvider } from "@/components/account/AccountProvider";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

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
      className={`${barlowCondensed.variable} ${figtree.variable}`}
    >
      <body className="antialiased">
        {previewBuild && (
          <p className="border-b-2 border-black bg-[var(--voltage)] px-3 py-1 text-center font-mono text-xs font-bold text-black">
            Not Rude Training Preview · {previewBuild}
          </p>
        )}
        <div className="app-shell"><AccountProvider>{children}</AccountProvider></div>
      </body>
    </html>
  );
}
