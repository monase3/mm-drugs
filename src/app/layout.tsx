import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة MM Drugs — أدويتك بين يديك",
  description:
    "منصة MM Drugs الرائدة لإدارة الصيدليات والبحث عن الأدوية في اليمن، مع لوحة تحكم للصيدليات، وتطبيق للمواطنين، وواجهة برمجية لأنظمة نقاط البيع.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
