"use client";

import { useCallback, useEffect, useState } from "react";

interface Drug {
  id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  category: string | null;
  unit: string;
  barcode: string | null;
  created_at: string;
}

export default function AdminDrugsPage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // form fields
  const [fName, setFName] = useState("");
  const [fGeneric, setFGeneric] = useState("");
  const [fManufacturer, setFManufacturer] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fUnit, setFUnit] = useState("علبة");
  const [fBarcode, setFBarcode] = useState("");
  const [fError, setFError] = useState<string | null>(null);
  const [fLoading, setFLoading] = useState(false);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (q) params.set("search", q);
    const res = await fetch(`/api/admin/drugs?${params}`);
    const d = await res.json();
    if (d.ok) { setDrugs(d.drugs); setTotal(d.total); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setFName(""); setFGeneric(""); setFManufacturer(""); setFCategory("");
    setFUnit("علبة"); setFBarcode(""); setFError(null); setEditId(null);
  }

  async function openEdit(d: Drug) {
    setEditId(d.id);
    setFName(d.name);
    setFGeneric(d.generic_name ?? "");
    setFManufacturer(d.manufacturer ?? "");
    setFCategory(d.category ?? "");
    setFUnit(d.unit);
    setFBarcode(d.barcode ?? "");
    setFError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFLoading(true);
    setFError(null);

    const isEdit = !!editId;
    const url = isEdit ? `/api/admin/drugs/${editId}` : "/api/admin/drugs";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName,
        genericName: fGeneric,
        manufacturer: fManufacturer,
        category: fCategory,
        unit: fUnit,
        barcode: fBarcode,
      }),
    });
    const d = await res.json();
    setFLoading(false);

    if (!d.ok) { setFError(d.error); return; }

    setShowForm(false);
    resetForm();
    load(search);
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الدواء؟")) return;
    await fetch(`/api/admin/drugs/${id}`, { method: "DELETE" });
    load(search);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">إدارة الأدوية</h1>
          <p className="mt-1 text-sm text-slate-500">{total} دواء في السجل</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
        >
          + إضافة دواء
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)}
          placeholder="🔍 بحث بالاسم أو الباركود..."
          className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
        />
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">
            {editId ? "تعديل الدواء" : "إضافة دواء جديد"}
          </h2>
          {fError && (
            <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{fError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">الاسم *</label>
              <input required value={fName} onChange={(e) => setFName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">الاسم العلمي</label>
              <input value={fGeneric} onChange={(e) => setFGeneric(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">الشركة المصنعة</label>
              <input value={fManufacturer} onChange={(e) => setFManufacturer(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">التصنيف</label>
              <input value={fCategory} onChange={(e) => setFCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">الوحدة</label>
              <input value={fUnit} onChange={(e) => setFUnit(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">الباركود</label>
              <input value={fBarcode} onChange={(e) => setFBarcode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" dir="ltr" />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
              <button type="submit" disabled={fLoading}
                className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {fLoading ? "جارٍ الحفظ..." : editId ? "تحديث" : "إضافة"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-500">جارٍ التحميل...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-right px-4 py-3">الاسم</th>
                <th className="text-right px-4 py-3">العلمي</th>
                <th className="text-right px-4 py-3">الشركة</th>
                <th className="text-right px-4 py-3">التصنيف</th>
                <th className="text-center px-4 py-3">الوحدة</th>
                <th className="text-center px-4 py-3">الباركود</th>
                <th className="text-center px-4 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drugs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500">{d.generic_name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{d.manufacturer ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{d.category ?? "-"}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{d.unit}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400" dir="ltr">{d.barcode ?? "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(d)}
                        className="text-xs font-bold text-teal-700 hover:underline">
                        تعديل
                      </button>
                      <button onClick={() => handleDelete(d.id)}
                        className="text-xs font-bold text-rose-600 hover:underline">
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {drugs.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">لا توجد أدوية</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
