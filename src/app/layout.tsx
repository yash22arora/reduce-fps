import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)'
            },
            success: {
              iconTheme: {
                primary: 'var(--neon-cyan)',
                secondary: 'black',
              },
              style: {
                border: '1px solid rgba(0, 240, 255, 0.3)',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)'
              }
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: 'white',
              },
              style: {
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.1)'
              }
            }
          }}
        />
        {children}
      </body>
    </html>
  );
}
