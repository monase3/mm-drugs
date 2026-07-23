import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventory, purchaseInvoices, pharmacyRequests } from "@/db/schema";
import { requirePharmacyAccess } from "@/lib/dashboard-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const ctx = await requirePharmacyAccess();
  if (!ctx) return null;

  const [{ count: itemsCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventory)
    .where(eq(inventory.pharmacyId, ctx.pharmacy.id));

  const [{ count: lowStockCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventory)
    .where(sql`${inventory.pharmacyId} = ${ctx.pharmacy.id} AND ${inventory.quantity} <= ${inventory.minStockLevel} AND ${inventory.quantity} > 0`);

  const [{ total: totalValue }] = await db
    .select({ total: sql<string>`coalesce(sum(${inventory.quantity} * ${inventory.retailPrice}), 0)` })
    .from(inventory)
    .where(eq(inventory.pharmacyId, ctx.pharmacy.id));

  const [{ count: invoicesCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.pharmacyId, ctx.pharmacy.id));

  const [{ count: expiredCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventory)
    .where(sql`${inventory.pharmacyId} = ${ctx.pharmacy.id} AND ${inventory.expiryDate} < CURRENT_DATE`);

  const [{ count: expiringSoon }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventory)
    .where(sql`${inventory.pharmacyId} = ${ctx.pharmacy.id}
      AND ${inventory.expiryDate} BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`);

  const [{ count: pendingRequests }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pharmacyRequests)
    .where(sql`${pharmacyRequests.pharmacyId} = ${ctx.pharmacy.id} AND ${pharmacyRequests.status} = 'pending'`);

  const stats = [
    { label: "أصناف الأدوية في المخزون", value: itemsCount, icon: "💊", color: "bg-teal-50 text-teal-700" },
    { label: "أصناف منخفضة المخزون", value: lowStockCount, icon: "⚠️", color: "bg-amber-50 text-amber-700" },
    {
      label: "قيمة المخزون الحالي",
      value: `${Number(totalValue).toLocaleString("ar-YE")} ﷼`,
      icon: "💰",
      color: "bg-emerald-50 text-emerald-700",
    },
    { label: "عدد فواتير المشتريات", value: invoicesCount, icon: "🧾", color: "bg-sky-50 text-sky-700" },
  ];

  const warnings: { label: string; value: number; icon: string; color: string; href: string }[] = [];
  if (expiredCount > 0) warnings.push({ label: "أدوية منتهية الصلاحية", value: expiredCount, icon: "🚫", color: "bg-red-50 text-red-700", href: "/dashboard/inventory" });
  if (expiringSoon > 0) warnings.push({ label: "تنتهي خلال 30 يوماً", value: expiringSoon, icon: "⏳", color: "bg-orange-50 text-orange-700", href: "/dashboard/inventory" });
  if (pendingRequests > 0) warnings.push({ label: "طلبات مواطنين معلقة", value: pendingRequests, icon: "📬", color: "bg-purple-50 text-purple-700", href: "/dashboard/requests" });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">مرحباً، {ctx.user.fullName}</h1>
          <p className="mt-1 text-sm text-slate-500">نظرة عامة على أداء {ctx.pharmacy.name}</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700"
        >
          🔑 مفتاح ربط نقاط البيع
        </Link>
      </div>

      {warnings.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {warnings.map((w) => (
            <Link key={w.label} href={w.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition flex items-center gap-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg ${w.color}`}>{w.icon}</div>
              <div>
                <p className="text-xl font-extrabold text-slate-900">{w.value}</p>
                <p className="text-xs text-slate-500">{w.label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl text-xl ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">إدارة المخزون</h2>
          <p className="mt-2 text-sm text-slate-500">
            أضف وحدّث الأدوية المتوفرة يدوياً، أو راقب التحديثات الواردة تلقائياً من نظام نقاط البيع.
          </p>
          <Link
            href="/dashboard/inventory"
            className="mt-4 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
          >
            الانتقال إلى المخزون
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">فواتير المشتريات</h2>
          <p className="mt-2 text-sm text-slate-500">
            سجّل فواتير الشراء من الموردين، وسيتم تحديث المخزون تلقائياً بالكميات الجديدة.
          </p>
          <Link
            href="/dashboard/invoices"
            className="mt-4 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            الانتقال إلى الفواتير
          </Link>
        </div>
      </div>
    </div>
  );
}
