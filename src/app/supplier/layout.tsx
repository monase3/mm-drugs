import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireSupplier } from "@/lib/supplier-auth";
import { SupplierSidebar } from "@/components/SupplierSidebar";

export const dynamic = "force-dynamic";

export default async function SupplierLayout({ children }: { children: ReactNode }) {
  const ctx = await requireSupplier();
  if (!ctx) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SupplierSidebar fullName={ctx.user.fullName} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
