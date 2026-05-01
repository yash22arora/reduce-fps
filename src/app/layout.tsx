import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChronoFrame | Custom FPS Video Converter",
  description: "Locally process and convert video frame rates with absolute precision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased selection:bg-[var(--neon-cyan)] selection:text-black`}
      >
        {children}
      </body>
    </html>
  );
}
