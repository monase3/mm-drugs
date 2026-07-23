"use client";

import { useEffect, useState } from "react";

interface SupplierOrder {
  id: string;
  status: string;
  totalAmount: string;
  notes: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  pharmacyName: string;
  pharmacyCity: string;
  items: { drugName: string; quantity: number; unitPrice: string }[];
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    const res = await fetch("/api/supplier/orders");
    const data = await res.json();
    if (data.ok) setOrders(data.orders);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAction(orderId: string, status: string) {
    if (!confirm("هل أنت متأكد؟")) return;
    await fetch("/api/supplier/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    load();
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">الطلبات الواردة</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "pending", "confirmed", "shipped", "delivered"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              filter === key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {key === "all" ? "الكل" : statusLabels[key]} ({counts[key]})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">جارٍ التحميل...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg text-slate-400">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">{order.pharmacyName}</p>
                  <p className="text-sm text-slate-500">{order.pharmacyCity}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString("ar-YE")} — {new Date(order.createdAt).toLocaleTimeString("ar-YE")}
                  </p>
                </div>
                <span className={`inline-block rounded-lg px-3 py-1 text-xs font-bold ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">الدواء</th>
                      <th className="px-4 py-2 font-semibold">الكمية</th>
                      <th className="px-4 py-2 font-semibold">السعر</th>
                      <th className="px-4 py-2 font-semibold">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-semibold text-slate-800">{item.drugName}</td>
                        <td className="px-4 py-2 text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-2 text-slate-600">{Number(item.unitPrice).toLocaleString("ar-YE")} ﷼</td>
                        <td className="px-4 py-2 font-bold text-slate-800">
                          {(item.quantity * Number(item.unitPrice)).toLocaleString("ar-YE")} ﷼
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-extrabold text-slate-900">
                  الإجمالي: {Number(order.totalAmount).toLocaleString("ar-YE")} ﷼
                </p>
                <div className="flex gap-2">
                  {order.status === "pending" && (
                    <>
                      <button onClick={() => handleAction(order.id, "confirmed")} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">
                        قبول الطلب
                      </button>
                      <button onClick={() => handleAction(order.id, "cancelled")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                        رفض
                      </button>
                    </>
                  )}
                  {order.status === "confirmed" && (
                    <button onClick={() => handleAction(order.id, "shipped")} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">
                      الشحن
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
