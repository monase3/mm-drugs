"use client";

import { useEffect, useState, type FormEvent } from "react";

interface SupplierProduct {
  id: string;
  price: string;
  minQuantity: number;
  available: boolean;
  drugId: string;
  drugName: string;
  genericName: string | null;
  unit: string;
  barcode: string | null;
}

const emptyForm = { drugName: "", genericName: "", manufacturer: "", barcode: "", price: "", minQuantity: "1" };

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/supplier/products");
    const data = await res.json();
    if (data.ok) setProducts(data.products);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/supplier/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugName: form.drugName,
          genericName: form.genericName || undefined,
          manufacturer: form.manufacturer || undefined,
          barcode: form.barcode || undefined,
          price: Number(form.price),
          minQuantity: Number(form.minQuantity),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error); return; }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  }

  async function toggleAvailable(id: string, available: boolean) {
    await fetch(`/api/supplier/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !available }),
    });
    load();
  }

  async function updatePrice(id: string, price: number) {
    await fetch(`/api/supplier/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price }),
    });
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm("هل تريد حذف هذا المنتج؟")) return;
    await fetch(`/api/supplier/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">منتجاتي</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700">
          {showForm ? "إلغاء" : "+ إضافة منتج"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
          {error && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 md:col-span-3">{error}</div>}
          <div><label className="mb-1 block text-sm font-semibold text-slate-700">اسم الدواء *</label><input required value={form.drugName} onChange={(e) => setForm({ ...form, drugName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-semibold text-slate-700">الاسم العلمي</label><input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-semibold text-slate-700">الشركة</label><input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-semibold text-slate-700">الباركود</label><input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} dir="ltr" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-semibold text-slate-700">السعر (ريال) *</label><input required type="number" min={0.01} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-sm font-semibold text-slate-700">الحد الأدنى للطلب</label><input type="number" min={1} value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
          <div className="md:col-span-3"><button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? "جارٍ..." : "حفظ المنتج"}</button></div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">الدواء</th>
              <th className="px-5 py-3 font-semibold">السعر</th>
              <th className="px-5 py-3 font-semibold">الحد الأدنى</th>
              <th className="px-5 py-3 font-semibold">الحالة</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">جارٍ التحميل...</td></tr>}
            {!loading && products.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">لا توجد منتجات بعد</td></tr>}
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-5 py-3"><p className="font-semibold text-slate-800">{p.drugName}</p>{p.genericName && <p className="text-xs text-slate-400">{p.genericName}</p>}</td>
                <td className="px-5 py-3"><input type="number" min={0.01} step="0.01" defaultValue={p.price} onBlur={(e) => updatePrice(p.id, Number(e.target.value))} className="w-24 rounded-md border border-slate-200 px-2 py-1 text-sm" /> ﷼</td>
                <td className="px-5 py-3 text-slate-600">{p.minQuantity}</td>
                <td className="px-5 py-3">
                  <button onClick={() => toggleAvailable(p.id, p.available)} className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold ${p.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {p.available ? "متوفر" : "غير متوفر"}
                  </button>
                </td>
                <td className="px-5 py-3"><button onClick={() => deleteProduct(p.id)} className="text-xs font-bold text-rose-600 hover:underline">حذف</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
