import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BorrowerProvider } from "@/contexts/BorrowerContext";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unbias Lending",
  description: "Digital home loan marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <BorrowerProvider>
          {children}
        </BorrowerProvider>
      </body>
    </html>
  );
}