"use client";

import { useCallback, useEffect, useState } from "react";

interface ApiKeyEntry {
  pharmacyId: string;
  pharmacyName: string;
  city: string;
  isActive: boolean;
  apiKey: string;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/api-keys");
    const d = await res.json();
    if (d.ok) setKeys(d.keys);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRegenerate(id: string, name: string) {
    if (!confirm(`إعادة توليد مفتاح API لـ "${name}"؟\n\nسيؤدي هذا إلى تعطيل المفتاح الحالي فوراً.`)) return;
    const res = await fetch(`/api/admin/api-keys/${id}/regenerate`, { method: "POST" });
    const d = await res.json();
    if (d.ok) {
      setActionMsg(`✅ تم إعادة توليد المفتاح لـ ${name}`);
      load();
    } else {
      setActionMsg(`❌ ${d.error}`);
    }
    setTimeout(() => setActionMsg(null), 4000);
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`سحب مفتاح API لـ "${name}"؟\n\nسيؤدي هذا إلى منع أي نظام POS من الاتصال بهذه الصيدلية.`)) return;
    const res = await fetch(`/api/admin/api-keys/${id}/revoke`, { method: "POST" });
    const d = await res.json();
    if (d.ok) {
      setActionMsg(`✅ تم سحب المفتاح لـ ${name}`);
      load();
    } else {
      setActionMsg(`❌ ${d.error}`);
    }
    setTimeout(() => setActionMsg(null), 4000);
  }

  if (loading) return <div className="py-20 text-center text-slate-500">جارٍ التحميل...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">إدارة مفاتيح API</h1>
        <p className="mt-1 text-sm text-slate-500">{keys.length} صيدلية</p>
      </div>

      {actionMsg && (
        <div className="mb-4 rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white">
          {actionMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3">الصيدلية</th>
              <th className="text-right px-4 py-3">المالك</th>
              <th className="text-right px-4 py-3">المدينة</th>
              <th className="text-center px-4 py-3">المفتاح</th>
              <th className="text-center px-4 py-3 min-w-[180px]">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keys.map((k) => (
              <tr key={k.pharmacyId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  {k.pharmacyName}
                  {!k.isActive && (
                    <span className="mr-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                      موقوف
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {k.ownerName ?? "-"}
                  <br /><span className="text-xs">{k.ownerEmail}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{k.city}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setRevealedId(revealedId === k.pharmacyId ? null : k.pharmacyId)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    {revealedId === k.pharmacyId ? "إخفاء" : "عرض"}
                  </button>
                  {revealedId === k.pharmacyId && (
                    <div className="mt-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs break-all" dir="ltr">
                      {k.apiKey}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleRegenerate(k.pharmacyId, k.pharmacyName)}
                      className="rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-50"
                    >
                      إعادة توليد
                    </button>
                    <button
                      onClick={() => handleRevoke(k.pharmacyId, k.pharmacyName)}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                    >
                      سحب
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-slate-400">لا توجد صيدليات</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
