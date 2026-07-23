"use client";

import { useCallback, useEffect, useState } from "react";

interface RequestItem {
  id: string;
  drug_name: string;
  quantity: number;
  notes: string | null;
  status: string;
  created_at: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  stock_quantity: number | null;
}

const statusLabels: Record<string, string> = {
  pending: "معلق",
  accepted: "مقبول",
  rejected: "مرفوض",
  fulfilled: "مكتمل",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-teal-100 text-teal-800",
  rejected: "bg-rose-100 text-rose-800",
  fulfilled: "bg-emerald-100 text-emerald-800",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async (status = "") => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (status) params.set("status", status);
    const res = await fetch(`/api/dashboard/requests?${params}`);
    const d = await res.json();
    if (d.ok) { setRequests(d.requests); setTotal(d.total); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/dashboard/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load(filter);
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">طلبات المواطنين</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} طلب
            {pendingCount > 0 && (
              <span className="mr-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {pendingCount} معلق
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {["", "pending", "accepted", "rejected", "fulfilled"].map((s) => (
            <button key={s} onClick={() => { setFilter(s); load(s); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition ${
                filter === s
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-teal-400"
              }`}>
              {s === "" ? "الكل" : statusLabels[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">جارٍ التحميل...</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900">{r.drug_name}</h3>
                    {r.stock_quantity !== null && r.stock_quantity !== undefined && (
                      <span className={`text-xs font-semibold ${r.stock_quantity > 0 ? "text-slate-500" : "text-rose-500"}`}>
                        {r.stock_quantity > 0 ? `المخزون: ${r.stock_quantity}` : "غير متوفر"}
                      </span>
                    )}
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[r.status]}`}>
                      {statusLabels[r.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    الكمية: {r.quantity} | من: {r.citizen_name ?? "مواطن"}
                    {r.citizen_phone && ` | جوال: ${r.citizen_phone}`}
                  </p>
                  {r.notes && <p className="mt-1 text-xs text-slate-400">ملاحظات: {r.notes}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString("ar-EG")}
                  </p>
                </div>
                {r.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => updateStatus(r.id, "accepted")}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700">
                      قبول
                    </button>
                    <button onClick={() => updateStatus(r.id, "rejected")}
                      className="rounded-lg border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">
                      رفض
                    </button>
                  </div>
                )}
                {r.status === "accepted" && (
                  <button onClick={() => updateStatus(r.id, "fulfilled")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                    تم التوفير
                  </button>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="py-10 text-center text-slate-400">لا توجد طلبات</div>
          )}
        </div>
      )}
    </div>
  );
}
