"use client";

import { useEffect, useState, type FormEvent } from "react";

interface InventoryItem {
  id: string;
  quantity: number;
  costPrice: string;
  retailPrice: string;
  expiryDate: string | null;
  batchNumber: string;
  minStockLevel: number;
  updatedAt: string;
  drugId: string;
  drugName: string;
  genericName: string | null;
  unit: string;
  barcode: string | null;
}

interface Movement {
  id: string;
  drugName: string;
  movementType: string;
  quantityChange: number;
  unitCost: string | null;
  reason: string | null;
  createdAt: string;
}

const emptyForm = {
  name: "",
  genericName: "",
  manufacturer: "",
  unit: "علبة",
  barcode: "",
  quantity: "0",
  costPrice: "0",
  retailPrice: "0",
  expiryDate: "",
  batchNumber: "",
  minStockLevel: "10",
};

const wasteReasons = [
  { value: "expired", label: "منتهي الصلاحية" },
  { value: "damaged", label: "تالف" },
  { value: "returned", label: "مرتجع من العميل" },
  { value: "other", label: "أخرى" },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showMovements, setShowMovements] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [showWaste, setShowWaste] = useState<string | null>(null);
  const [wasteQty, setWasteQty] = useState("1");
  const [wasteReason, setWasteReason] = useState("damaged");
  const [wasteNotes, setWasteNotes] = useState("");

  async function loadItems() {
    setLoading(true);
    const res = await fetch("/api/dashboard/inventory");
    const data = await res.json();
    if (data.ok) setItems(data.items);
    setLoading(false);
  }

  async function loadMovements() {
    const res = await fetch("/api/dashboard/waste?limit=20");
    const data = await res.json();
    if (data.ok) setMovements(data.movements);
    setShowMovements(true);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          genericName: form.genericName || undefined,
          manufacturer: form.manufacturer || undefined,
          unit: form.unit || undefined,
          barcode: form.barcode || undefined,
          quantity: Number(form.quantity),
          costPrice: Number(form.costPrice),
          retailPrice: Number(form.retailPrice),
          expiryDate: form.expiryDate || undefined,
          batchNumber: form.batchNumber || undefined,
          minStockLevel: Number(form.minStockLevel),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "تعذّر حفظ الصنف");
        return;
      }
      setForm(emptyForm);
      setShowForm(false);
      loadItems();
    } finally {
      setSaving(false);
    }
  }

  async function updateQuantity(id: string, quantity: number) {
    await fetch(`/api/dashboard/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    loadItems();
  }

  async function handleWaste(drugId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugId,
          quantity: Number(wasteQty),
          reason: wasteReason,
          notes: wasteNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "تعذّر الصرف");
        return;
      }
      setShowWaste(null);
      setWasteQty("1");
      setWasteNotes("");
      loadItems();
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("هل تريد حذف هذا الصنف من المخزون؟")) return;
    await fetch(`/api/dashboard/inventory/${id}`, { method: "DELETE" });
    loadItems();
  }

  const filtered = items.filter((item) =>
    item.drugName.toLowerCase().includes(search.toLowerCase()),
  );

  const totalRetail = items.reduce((sum, i) => sum + i.quantity * Number(i.retailPrice), 0);
  const totalCost = items.reduce((sum, i) => sum + i.quantity * Number(i.costPrice), 0);
  const totalProfit = totalRetail - totalCost;

  const movementTypeLabels: Record<string, string> = {
    purchase: "شراء",
    sale: "بيع",
    waste: "صرف",
    adjustment: "تعديل",
    return: "مرتجع",
    transfer: "تحويل",
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">إدارة المخزون</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} صنف — إجمالي القيمة: {totalRetail.toLocaleString("ar-YE")} ﷼ | هامش الربح: {totalProfit.toLocaleString("ar-YE")} ﷼
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMovements}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-400"
          >
            📋 سجل الحركات
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
          >
            {showForm ? "إلغاء" : "+ إضافة صنف"}
          </button>
        </div>
      </div>

      {showMovements && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">سجل حركات المخزون</h2>
            <button onClick={() => setShowMovements(false)} className="text-sm text-slate-500 hover:text-slate-700">✕</button>
          </div>
          {movements.length === 0 ? (
            <p className="text-sm text-slate-400">لا توجد حركات بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">الدواء</th>
                    <th className="px-4 py-2 font-semibold">النوع</th>
                    <th className="px-4 py-2 font-semibold">الكمية</th>
                    <th className="px-4 py-2 font-semibold">السبب</th>
                    <th className="px-4 py-2 font-semibold">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{m.drugName}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                          m.movementType === "purchase" ? "bg-green-100 text-green-700" :
                          m.movementType === "sale" ? "bg-blue-100 text-blue-700" :
                          m.movementType === "waste" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {movementTypeLabels[m.movementType] ?? m.movementType}
                        </span>
                      </td>
                      <td className={`px-4 py-2 font-bold ${m.quantityChange > 0 ? "text-green-600" : "text-red-600"}`}>
                        {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{m.reason ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">{new Date(m.createdAt).toLocaleString("ar-YE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showWaste && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <h3 className="mb-4 text-lg font-bold text-red-800">صرف صنف</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الكمية</label>
              <input type="number" min={1} value={wasteQty} onChange={(e) => setWasteQty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">السبب</label>
              <select value={wasteReason} onChange={(e) => setWasteReason(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {wasteReasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">ملاحظات</label>
              <input value={wasteNotes} onChange={(e) => setWasteNotes(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="اختياري" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => handleWaste(showWaste)} disabled={saving} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? "جارٍ..." : "تأكيد الصرف"}
            </button>
            <button onClick={() => setShowWaste(null)} className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4"
        >
          {error && (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 md:col-span-4">
              {error}
            </div>
          )}
          <Field label="اسم الدواء *" className="md:col-span-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="الاسم العلمي">
            <input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="input" />
          </Field>
          <Field label="الشركة المصنّعة">
            <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="input" />
          </Field>
          <Field label="الوحدة">
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input" />
          </Field>
          <Field label="الباركود">
            <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} dir="ltr" className="input" />
          </Field>
          <Field label="رقم التشغيلة">
            <input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} dir="ltr" className="input" />
          </Field>
          <Field label="الكمية *">
            <input required type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input" />
          </Field>
          <Field label="سعر التكلفة *">
            <input required type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="input" />
          </Field>
          <Field label="سعر البيع *">
            <input required type="number" min={0} step="0.01" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: e.target.value })} className="input" />
          </Field>
          <Field label="حد أدنى للمخزون">
            <input type="number" min={0} value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} className="input" />
          </Field>
          <Field label="تاريخ الانتهاء">
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="input" />
          </Field>
          <div className="md:col-span-4">
            <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
              {saving ? "جارٍ الحفظ..." : "حفظ الصنف"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث عن دواء..." className="w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">الدواء</th>
              <th className="px-4 py-3 font-semibold">الكمية</th>
              <th className="px-4 py-3 font-semibold">سعر التكلفة</th>
              <th className="px-4 py-3 font-semibold">سعر البيع</th>
              <th className="px-4 py-3 font-semibold">هامش الربح</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">جارٍ التحميل...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">لا توجد أصناف في المخزون بعد</td></tr>
            )}
            {filtered.map((item) => {
              const margin = Number(item.retailPrice) > 0
                ? ((Number(item.retailPrice) - Number(item.costPrice)) / Number(item.retailPrice) * 100).toFixed(1)
                : "0";
              const isLow = item.quantity > 0 && item.quantity <= item.minStockLevel;
              const isOut = item.quantity === 0;
              const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
              const isExpiringSoon = item.expiryDate && (() => {
                const days = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
                return days > 0 && days <= 30;
              })();

              return (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{item.drugName}</p>
                    {item.genericName && <p className="text-xs text-slate-400">{item.genericName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={0} defaultValue={item.quantity}
                      onBlur={(e) => updateQuantity(item.id, Number(e.target.value))}
                      className={`w-16 rounded-md border px-2 py-1 text-sm ${isOut ? "border-red-300 bg-red-50" : isLow ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{Number(item.costPrice).toLocaleString("ar-YE")} ﷼</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{Number(item.retailPrice).toLocaleString("ar-YE")} ﷼</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                      Number(margin) >= 30 ? "bg-green-100 text-green-700" :
                      Number(margin) >= 15 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isOut && <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">نافد</span>}
                    {isLow && <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">منخفض</span>}
                    {isExpired && <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">منتهي</span>}
                    {isExpiringSoon && <span className="inline-block rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">وشيك الانتهاء</span>}
                    {!isOut && !isLow && !isExpired && !isExpiringSoon && (
                      <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">متوفر</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex gap-2">
                      <button onClick={() => setShowWaste(item.drugId)} className="text-xs font-bold text-orange-600 hover:underline">صرف</button>
                      <button onClick={() => deleteItem(item.id)} className="text-xs font-bold text-rose-600 hover:underline">حذف</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.55rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: rgb(20 184 166);
          box-shadow: 0 0 0 3px rgb(204 251 241);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}
