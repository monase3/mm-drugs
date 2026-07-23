"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Pharmacy {
  id: string;
  name: string;
  license_number: string;
  city: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
}

export default function AdminPharmaciesPage() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/pharmacies")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPharmacies(d.pharmacies);
        else setError(d.error);
      })
      .catch(() => setError("فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/pharmacies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    router.refresh();
    setPharmacies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p))
    );
  }

  if (loading) return <div className="text-center py-20 text-slate-500">جارٍ التحميل...</div>;
  if (error) return <div className="text-center py-20 text-rose-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">إدارة الصيدليات</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3">الاسم</th>
              <th className="text-right px-4 py-3">المالك</th>
              <th className="text-right px-4 py-3">المدينة</th>
              <th className="text-right px-4 py-3">رقم الترخيص</th>
              <th className="text-center px-4 py-3">الحالة</th>
              <th className="text-center px-4 py-3">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pharmacies.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">
                  {p.owner_name ?? "-"}
                  <br />
                  <span className="text-xs">{p.owner_email}</span>
                </td>
                <td className="px-4 py-3">{p.city}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.license_number}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                    p.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {p.is_active ? "نشط" : "موقوف"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(p.id, p.is_active)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                      p.is_active
                        ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {p.is_active ? "تعطيل" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
            {pharmacies.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  لا توجد صيدليات مسجلة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
