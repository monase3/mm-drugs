"use client";

import { useEffect, useState, type FormEvent } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  invoiceDate: string;
  createdAt: string;
  supplierName: string | null;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
}

interface LineItem {
  drugName: string;
  quantity: string;
  unitCost: string;
}

const emptyLine: LineItem = { drugName: "", quantity: "1", unitCost: "0" };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [invRes, supRes] = await Promise.all([
      fetch("/api/dashboard/invoices"),
      fetch("/api/dashboard/suppliers"),
    ]);
    const invData = await invRes.json();
    const supData = await supRes.json();
    if (invData.ok) setInvoices(invData.invoices);
    if (supData.ok) setSuppliers(supData.suppliers);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const total = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0),
    0,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let finalSupplierId = supplierId || undefined;
      if (!finalSupplierId && newSupplierName.trim()) {
        const res = await fetch("/api/dashboard/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSupplierName.trim() }),
        });
        const data = await res.json();
        if (data.ok) finalSupplierId = data.supplier.id;
      }

      const res = await fetch("/api/dashboard/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          supplierId: finalSupplierId,
          invoiceDate,
          items: lines.map((line) => ({
            drugName: line.drugName,
            quantity: Number(line.quantity),
            unitCost: Number(line.unitCost),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "تعذّر حفظ الفاتورة");
        return;
      }
      setInvoiceNumber("");
      setSupplierId("");
      setNewSupplierName("");
      setLines([{ ...emptyLine }]);
      setShowForm(false);
      loadData();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">فواتير المشتريات</h1>
          <p className="mt-1 text-sm text-slate-500">
            تسجيل فواتير الشراء يحدّث المخزون تلقائياً بالكميات الجديدة
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
        >
          {showForm ? "إلغاء" : "+ فاتورة جديدة"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                رقم الفاتورة *
              </label>
              <input
                required
                dir="ltr"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ الفاتورة *</label>
              <input
                required
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">المورّد</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">— مورّد جديد —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {!supplierId && (
                <input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="اسم المورّد الجديد (اختياري)"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">أصناف الفاتورة</h3>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-bold text-teal-700 hover:underline"
              >
                + إضافة صنف
              </button>
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 items-center gap-3">
                  <input
                    required
                    placeholder="اسم الدواء"
                    value={line.drugName}
                    onChange={(e) => updateLine(index, { drugName: e.target.value })}
                    className="col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                  <input
                    required
                    type="number"
                    min={1}
                    placeholder="الكمية"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: e.target.value })}
                    className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="تكلفة الوحدة"
                    value={line.unitCost}
                    onChange={(e) => updateLine(index, { unitCost: e.target.value })}
                    className="col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                    className="col-span-1 text-sm font-bold text-rose-500 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-bold text-slate-700">
              الإجمالي: <span className="text-teal-700">{total.toLocaleString("ar-YE")} ﷼</span>
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الفاتورة"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">رقم الفاتورة</th>
              <th className="px-5 py-3 font-semibold">المورّد</th>
              <th className="px-5 py-3 font-semibold">التاريخ</th>
              <th className="px-5 py-3 font-semibold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                  لا توجد فواتير مسجّلة بعد
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-semibold text-slate-800">{inv.invoiceNumber}</td>
                <td className="px-5 py-3 text-slate-600">{inv.supplierName ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{inv.invoiceDate}</td>
                <td className="px-5 py-3 font-semibold text-teal-700">
                  {Number(inv.totalAmount).toLocaleString("ar-YE")} ﷼
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
