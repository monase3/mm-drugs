"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ownerLinks = [
  { href: "/dashboard", label: "نظرة عامة", icon: "📊" },
  { href: "/dashboard/inventory", label: "المخزون", icon: "📦" },
  { href: "/dashboard/marketplace", label: "سوق الأدوية", icon: "🛒" },
  { href: "/dashboard/orders", label: "سجل الطلبات", icon: "📋" },
  { href: "/dashboard/invoices", label: "فواتير المشتريات", icon: "🧾" },
  { href: "/dashboard/staff", label: "الموظفين", icon: "👥" },
  { href: "/dashboard/reports", label: "التقارير", icon: "📈" },
  { href: "/dashboard/requests", label: "طلبات المواطنين", icon: "📬" },
  { href: "/dashboard/notifications", label: "الإشعارات", icon: "🔔" },
  { href: "/dashboard/settings", label: "إعدادات وربط API", icon: "⚙️" },
];

const staffLinks = [
  { href: "/dashboard", label: "نظرة عامة", icon: "📊" },
  { href: "/dashboard/inventory", label: "المخزون", icon: "📦" },
  { href: "/dashboard/requests", label: "طلبات المواطنين", icon: "📬" },
];

export function DashboardSidebar({ pharmacyName, isOwner }: { pharmacyName: string; isOwner: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const links = isOwner ? ownerLinks : staffLinks;

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <Link href="/" className="text-lg font-extrabold text-teal-700">
          MM درجز
        </Link>
        <p className="mt-1 truncate text-sm text-slate-500">{pharmacyName}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{link.icon}</span>
              <span className="flex-1">{link.label}</span>
              {link.href === "/dashboard/notifications" && unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        {!isOwner && (
          <p className="mb-3 text-center text-xs text-slate-400">صلاحية موظف</p>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
