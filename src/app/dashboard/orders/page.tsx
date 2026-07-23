"use client";

import { useEffect, useState } from "react";

interface OrderItem {
  drugName: string;
  quantity: number;
  unitPrice: string;
}

interface Order {
  id: string;
  supplierId: string;
  status: string;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  supplierName: string;
  items: OrderItem[];
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

const statusIcons: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  shipped: "🚚",
  delivered: "📦",
  cancelled: "❌",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [ratingModal, setRatingModal] = useState<{ orderId: string; supplierId: string } | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const res = await fetch("/api/marketplace/orders");
    const data = await res.json();
    if (data.ok) setOrders(data.orders);
    setLoading(false);
  }

  async function confirmDelivery(orderId: string) {
    if (!confirm("تأكيد استلام الطلب؟")) return;
    await fetch("/api/marketplace/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "delivered" }),
    });
    await loadOrders();
  }

  async function submitRating() {
    if (!ratingModal) return;
    setRatingSaving(true);
    const res = await fetch("/api/supplier-ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: ratingModal.orderId, score: ratingScore, comment: ratingComment || undefined }),
    });
    const data = await res.json();
    setRatingSaving(false);
    if (data.ok) {
      setRatingSuccess(true);
      setRatingModal(null);
      setRatingComment("");
      setRatingScore(5);
      setTimeout(() => setRatingSuccess(false), 3000);
    }
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">سجل الطلبات</h1>

      {ratingSuccess && (
        <div className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          تم إرسال التقييم بنجاح! شكراً لك.
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"] as const).map((key) => (
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
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{statusIcons[order.status]}</span>
                    <p className="text-lg font-bold text-slate-900">{order.supplierName}</p>
                  </div>
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
                {order.status === "shipped" && (
                  <button onClick={() => confirmDelivery(order.id)} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700">
                    تأكيد الاستلام
                  </button>
                )}
                {order.status === "delivered" && (
                  <button onClick={() => setRatingModal({ orderId: order.id, supplierId: order.supplierId })} className="rounded-lg bg-yellow-500 px-5 py-2 text-sm font-bold text-white hover:bg-yellow-600">
                    ★ تقييم
                  </button>
                )}
              </div>

              <div className="mt-3 flex gap-4 text-xs text-slate-400">
                {order.confirmedAt && <span>✅ تأكيد المورد: {new Date(order.confirmedAt).toLocaleDateString("ar-YE")}</span>}
                {order.shippedAt && <span>🚚 الشحن: {new Date(order.shippedAt).toLocaleDateString("ar-YE")}</span>}
                {order.deliveredAt && <span>📦 التوصيل: {new Date(order.deliveredAt).toLocaleDateString("ar-YE")}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRatingModal(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">تقييم المورد</h2>
            <div className="mb-4 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRatingScore(s)} className={`text-3xl ${s <= ratingScore ? "text-yellow-500" : "text-slate-200"} hover:text-yellow-400`}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
              placeholder="أضف تعليقاً (اختياري)..."
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setRatingModal(null)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">
                إلغاء
              </button>
              <button onClick={submitRating} disabled={ratingSaving} className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {ratingSaving ? "جارٍ الإرسال..." : "إرسال التقييم"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
