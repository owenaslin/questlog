import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="scanlines candlelight-vignette">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
