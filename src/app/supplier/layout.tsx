import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireSupplier } from "@/lib/supplier-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SupplierLayout({ children }: { children: ReactNode }) {
  const ctx = await requireSupplier();
  if (!ctx) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 border-l border-slate-200 bg-white p-6">
        <h2 className="mb-8 text-lg font-extrabold text-slate-900">لوحة تحكم المورد</h2>
        <nav className="space-y-1">
          <SidebarLink href="/supplier" label="الرئيسية" icon="📦" />
          <SidebarLink href="/supplier/products" label="منتجاتي" icon="💊" />
          <SidebarLink href="/supplier/orders" label="الطلبات الواردة" icon="📋" />
        </nav>
        <div className="mt-8 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">مرحباً،</p>
          <p className="font-bold text-slate-800">{ctx.user.fullName}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}

function SidebarLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
      <span>{icon}</span>
      {label}
    </Link>
  );
}
