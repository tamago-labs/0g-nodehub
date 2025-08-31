import type { Metadata } from "next";
import "./globals.css"; 
import { Sora } from "next/font/google"
import { Providers } from "./providers"
import Sidebar from "@/components/Sidebar";

const Font = Sora({
  weight: ["400", "500", "600", "700"],
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
      <body className={Font.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black relative overflow-hidden">
             
            
            {/* Main Layout */}
            <div className="flex min-h-screen relative z-10">
              <Sidebar />
              <main className="flex-1 ml-64">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
