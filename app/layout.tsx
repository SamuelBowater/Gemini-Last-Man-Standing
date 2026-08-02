import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import { RegisterServiceWorker } from "@/components/register-sw";
import "./globals.css";

const poppins = Poppins({ weight: ["600", "700"], subsets: ["latin"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Gemini's Last Man Standing",
  description: "Premier League survival pool — pick a forward, a midfielder and a defender every gameweek.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gemini Last-Man-Standing",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${inter.variable} antialiased`}>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
