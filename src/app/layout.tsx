import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@mysten/dapp-kit/dist/index.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppWalletProvider from "@/components/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blast Wheels - Play-to-Earn Racing Game",
  description: "The Ultimate Play-to-Earn Racing Game on Blast.fun! Climb the leaderboard, challenge your friends in live online races, and upgrade your garage with powerful cars.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <AppWalletProvider>
          <Header />
          <main className="flex-1 pt-20">
            {children}
          </main>
          <Footer />
        </AppWalletProvider>
      </body>
    </html>
  );
}
