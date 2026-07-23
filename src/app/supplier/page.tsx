"use client";

import { useEffect, useState } from "react";

interface SupplierProduct {
  id: string;
  price: string;
  minQuantity: number;
  available: boolean;
  drugId: string;
  drugName: string;
  genericName: string | null;
  unit: string;
}

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
  items: { drugName: string; quantity: number; unitPrice: string }[];
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  expired: "منتهي",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-700",
};

export default function SupplierDashboard() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/supplier/products").then((r) => r.json()),
      fetch("/api/supplier/orders").then((r) => r.json()),
    ]).then(([prodData, orderData]) => {
      if (prodData.ok) setProducts(prodData.products);
      if (orderData.ok) setOrders(orderData.orders);
      setLoading(false);
    });
  }, []);

  async function handleOrderAction(orderId: string, status: string) {
    await fetch("/api/supplier/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    const res = await fetch("/api/supplier/orders").then((r) => r.json());
    if (res.ok) setOrders(res.orders);
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const totalRevenue = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-extrabold text-slate-900">مرحباً بك في لوحة تحكم المورد</h1>

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-xl">📦</div>
          <p className="text-2xl font-extrabold text-slate-900">{products.length}</p>
          <p className="mt-1 text-sm text-slate-500">منتج مسجّل</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-xl">📋</div>
          <p className="text-2xl font-extrabold text-slate-900">{pendingOrders.length}</p>
          <p className="mt-1 text-sm text-slate-500">طلب معلق</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-green-50 text-xl">💰</div>
          <p className="text-2xl font-extrabold text-slate-900">{totalRevenue.toLocaleString("ar-YE")} ﷼</p>
          <p className="mt-1 text-sm text-slate-500">إجمالي المبيعات</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">الطلبات الواردة</h2>
        {loading ? (
          <p className="text-sm text-slate-400">جارٍ التحميل...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-400">لا توجد طلبات بعد</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{order.pharmacyName}</p>
                    <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString("ar-YE")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    {order.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => handleOrderAction(order.id, "confirmed")} className="rounded bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700">تأكيد</button>
                        <button onClick={() => handleOrderAction(order.id, "cancelled")} className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700">رفض</button>
                      </div>
                    )}
                    {order.status === "confirmed" && (
                      <button onClick={() => handleOrderAction(order.id, "shipped")} className="rounded bg-purple-600 px-3 py-1 text-xs font-bold text-white hover:bg-purple-700">شحن</button>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-slate-500">المنتجات:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <span key={i} className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {item.drugName} × {item.quantity} — {Number(item.unitPrice).toLocaleString("ar-YE")} ﷼
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-800">الإجمالي: {Number(order.totalAmount).toLocaleString("ar-YE")} ﷼</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
