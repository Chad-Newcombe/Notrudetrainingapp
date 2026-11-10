import type { Metadata, Viewport } from "next";
import { Figtree, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AccountProvider } from "@/components/account/AccountProvider";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Notrude",
  description: "Empathetic training that meets you where you are.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Notrude",
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
      className={`${spaceGrotesk.variable} ${figtree.variable}`}
    >
      <body className="antialiased">
        {previewBuild && (
          <p className="bg-violet-950 px-3 py-1 text-center font-mono text-xs text-violet-100">
            Notrude Preview · {previewBuild}
          </p>
        )}
        <div className="app-shell"><AccountProvider>{children}</AccountProvider></div>
      </body>
    </html>
  );
}
