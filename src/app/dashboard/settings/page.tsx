import Link from "next/link";
import { requirePharmacyOwner } from "@/lib/dashboard-auth";
import { CopyableCode } from "@/components/CopyableCode";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requirePharmacyOwner();
  if (!ctx) return null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">الإعدادات وربط نقاط البيع</h1>
      <p className="mt-1 text-sm text-slate-500">
        استخدم هذه البيانات لربط نظام نقاط البيع (POS) الخاص بصيدليتك مع منصة MM Drugs
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">بيانات الصيدلية</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">اسم الصيدلية</dt>
            <dd className="font-semibold text-slate-800">{ctx.pharmacy.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">رقم الترخيص</dt>
            <dd className="font-semibold text-slate-800">{ctx.pharmacy.licenseNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">المدينة</dt>
            <dd className="font-semibold text-slate-800">{ctx.pharmacy.city}</dd>
          </div>
          <div>
            <dt className="text-slate-500">الحالة</dt>
            <dd className="font-semibold text-emerald-600">
              {ctx.pharmacy.isActive ? "مفعّلة" : "غير مفعّلة"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-slate-900">مفتاح API الخاص بصيدليتك</h2>
        <p className="mb-4 text-sm text-slate-500">
          أرسل هذا المفتاح في رأس الطلب <code dir="ltr">X-API-Key</code> عند استدعاء نقطة النهاية{" "}
          <code dir="ltr">/api/pos/sync</code>. لا تشارك هذا المفتاح مع أي جهة غير موثوقة.
        </p>
        <CopyableCode value={ctx.pharmacy.apiKey} />
        <Link href="/docs" className="mt-4 inline-block text-sm font-bold text-teal-700 hover:underline">
          عرض التوثيق الكامل لواجهة المزامنة ←
        </Link>
      </div>
    </div>
  );
}
