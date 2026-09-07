"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/supplier", label: "الرئيسية", icon: "📦" },
  { href: "/supplier/products", label: "منتجاتي", icon: "💊" },
  { href: "/supplier/orders", label: "الطلبات الواردة", icon: "📋" },
];

export function SupplierSidebar({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <Link href="/supplier" className="text-lg font-extrabold text-teal-700">
          MM درجز — مورد
        </Link>
        <p className="mt-1 truncate text-sm text-slate-500">لوحة تحكم المورد</p>
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
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <p className="mb-3 text-center text-xs text-slate-400">{fullName}</p>
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
