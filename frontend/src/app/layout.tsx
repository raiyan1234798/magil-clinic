import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/AuthGuard";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Magil Clinic ERP",
  description: "Complete clinic management system for Magil Clinic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className={`${dmSans.className} min-h-full flex flex-col bg-background antialiased`}>
        <AuthGuard>{children}</AuthGuard>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
