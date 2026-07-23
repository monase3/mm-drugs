import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requirePharmacyAccess } from "@/lib/dashboard-auth";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePharmacyAccess();
  if (!ctx) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar pharmacyName={ctx.pharmacy.name} isOwner={ctx.isOwner} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
