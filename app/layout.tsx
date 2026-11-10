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
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${figtree.variable}`}
    >
      <body className="antialiased">
        <div className="app-shell"><AccountProvider>{children}</AccountProvider></div>
      </body>
    </html>
  );
}
