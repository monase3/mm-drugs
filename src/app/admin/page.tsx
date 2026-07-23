import { db } from "@/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/dashboard-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const ctx = await requireAdmin();
  if (!ctx) return null;

  const [{ count: usersCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`users`);

  const [{ count: pharmaciesCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`pharmacies`);

  const [{ count: activePharm }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`pharmacies`)
    .where(sql`is_active = TRUE`);

  const [{ count: drugsCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`drugs`);

  const [{ count: auditCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`admin_audit_log`);

  const stats = [
    { label: "إجمالي المستخدمين", value: usersCount, icon: "👥", color: "bg-blue-50 text-blue-700" },
    { label: "الصيدليات المسجلة", value: pharmaciesCount, icon: "🏥", color: "bg-teal-50 text-teal-700" },
    { label: "صيدليات نشطة", value: activePharm, icon: "✅", color: "bg-emerald-50 text-emerald-700" },
    { label: "الأدوية في السجل", value: drugsCount, icon: "💊", color: "bg-amber-50 text-amber-700" },
    { label: "إجراءات مسجلة", value: auditCount, icon: "📋", color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">لوحة تحكم المشرف</h1>
        <p className="mt-1 text-sm text-slate-500">نظرة عامة على منصة MM Drugs</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl text-xl ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/pharmacies" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-400 transition">
          <h2 className="text-lg font-bold text-slate-900">إدارة الصيدليات</h2>
          <p className="mt-2 text-sm text-slate-500">عرض وتفعيل وتعطيل الصيدليات المسجلة في المنصة</p>
        </Link>
        <Link href="/admin/users" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-400 transition">
          <h2 className="text-lg font-bold text-slate-900">إدارة المستخدمين</h2>
          <p className="mt-2 text-sm text-slate-500">عرض وإدارة صلاحيات المستخدمين</p>
        </Link>
        <Link href="/admin/drugs" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-400 transition">
          <h2 className="text-lg font-bold text-slate-900">إدارة الأدوية</h2>
          <p className="mt-2 text-sm text-slate-500">إضافة وتعديل وحذف الأدوية في سجل المنصة</p>
        </Link>
        <Link href="/admin/api-keys" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-400 transition">
          <h2 className="text-lg font-bold text-slate-900">مفاتيح API</h2>
          <p className="mt-2 text-sm text-slate-500">إدارة وإعادة توليد مفاتيح الربط لأنظمة نقاط البيع</p>
        </Link>
        <Link href="/admin/audit-log" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-400 transition">
          <h2 className="text-lg font-bold text-slate-900">سجل النشاطات</h2>
          <p className="mt-2 text-sm text-slate-500">تتبع جميع الإجراءات التي قام بها المشرفون</p>
        </Link>
      </div>
    </div>
  );
}
