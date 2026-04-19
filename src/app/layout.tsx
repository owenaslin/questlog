import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import ViewModeProvider from "@/components/ViewModeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Tarvn — The Adventurer's Tavern",
  description:
    "Every hero needs a tavern. Collect quests, track your journey, celebrate triumphs and build your legend at Tarvn.",
  metadataBase: new URL("https://tarvn.xyz"),
  openGraph: {
    title: "Tarvn — The Adventurer's Tavern",
    description: "Every hero needs a tavern. Collect quests, track your journey, celebrate triumphs.",
    url: "https://tarvn.xyz",
    siteName: "Tarvn",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarvn — The Adventurer's Tavern",
    description: "Every hero needs a tavern. Collect quests, track your journey, celebrate triumphs.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tarvn",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#1a1510",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="scanlines candlelight-vignette pb-20 md:pb-0">
        <ViewModeProvider>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          <MobileBottomNav />
          <Analytics />
          <SpeedInsights />
        </ViewModeProvider>
      </body>
    </html>
  );
}
