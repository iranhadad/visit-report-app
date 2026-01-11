import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ✅ הוספת ה־Context
import { WorkProvider } from "@/app/context/WorkContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "דיווח טכנאים",
  description: "מערכת דיווח וסיכום יומי",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
          bg-gray-100
          text-right
        `}
      >
        {/* 🔑 כאן עוטפים את כל האפליקציה */}
        <WorkProvider>
          {children}
        </WorkProvider>
      </body>
    </html>
  );
}
