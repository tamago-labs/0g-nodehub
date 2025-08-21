import type { Metadata } from "next";
import "./globals.css";
import Head from 'next/head'
import { Inter } from "next/font/google";
import { Providers } from "./providers"
import Header from "@/components/Header";
import Footer from "@/components/Footer"

const InterFont = Inter({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "0G NodeHub - Deploy & Manage 0G Network Nodes",
  description: "Deploy and manage your 0G inference provider nodes with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={InterFont.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
            <div className="flex flex-col min-h-screen w-full">
              <Header />
              {children}
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
