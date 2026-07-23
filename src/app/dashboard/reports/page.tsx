"use client";

import { useCallback, useEffect, useState } from "react";

interface Summary {
  total_retail_value: string;
  total_cost_value: string;
  total_potential_profit: string;
  total_items: number;
  low_stock_items: number;
  out_of_stock: number;
  expired_items: number;
  expiring_soon: number;
}

interface CategoryRow {
  category: string;
  items: number;
  total_qty: number;
  total_retail: string;
  total_cost: string;
  profit: string;
}

interface MonthRow {
  month: string;
  invoices_count: number;
  total_amount: string;
}

interface SalesAnalytics {
  total_sales: string;
  total_profit: string;
  top_drugs: { name: string; quantity: number; revenue: string }[];
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<CategoryRow[]>([]);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [sales, setSales] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthsCount, setMonthsCount] = useState(12);

  const load = useCallback(async () => {
    setLoading(true);
    const [ivRes, mpRes, saRes] = await Promise.all([
      fetch("/api/dashboard/reports/inventory-value"),
      fetch(`/api/dashboard/reports/monthly-purchases?months=${monthsCount}`),
      fetch("/api/dashboard/reports/sales-analytics"),
    ]);
    const iv = await ivRes.json();
    const mp = await mpRes.json();
    const sa = await saRes.json();
    if (iv.ok) { setSummary(iv.summary); setByCategory(iv.byCategory); }
    if (mp.ok) setMonths(mp.months);
    if (sa.ok) setSales(sa);
    setLoading(false);
  }, [monthsCount]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-20 text-center text-slate-500">جارٍ التحميل...</div>;

  const formatCurrency = (v: string | number) =>
    Number(v).toLocaleString("ar-YE") + " ﷼";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">التقارير</h1>
          <p className="mt-1 text-sm text-slate-500">تحليل المخزون والمشتريات والمبيعات</p>
        </div>
        <a
          href="/api/dashboard/reports/export-inventory"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-400 hover:text-teal-700"
        >
          ⬇ تصدير المخزون Excel
        </a>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">قيمة المخزون (بيع)</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrency(summary.total_retail_value)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">قيمة المخزون (تكلفة)</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrency(summary.total_cost_value)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">الربح المتوقع</p>
            <p className="mt-1 text-xl font-extrabold text-green-600">{formatCurrency(summary.total_potential_profit)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">إجمالي الأصناف</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{summary.total_items}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">أصناف منخفضة</p>
            <p className={`mt-1 text-xl font-extrabold ${summary.low_stock_items > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {summary.low_stock_items}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">نفد من المخزون</p>
            <p className={`mt-1 text-xl font-extrabold ${summary.out_of_stock > 0 ? "text-red-600" : "text-slate-900"}`}>
              {summary.out_of_stock}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">منتهية الصلاحية</p>
            <p className={`mt-1 text-xl font-extrabold ${summary.expired_items > 0 ? "text-red-600" : "text-slate-900"}`}>
              {summary.expired_items}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">تنتهي قريباً (30 يوم)</p>
            <p className={`mt-1 text-xl font-extrabold ${summary.expiring_soon > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {summary.expiring_soon}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* By category */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">المخزون حسب التصنيف</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="text-right px-3 py-2">التصنيف</th>
                  <th className="text-center px-3 py-2">الكمية</th>
                  <th className="text-left px-3 py-2">التكلفة</th>
                  <th className="text-left px-3 py-2">البيع</th>
                  <th className="text-left px-3 py-2">الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="px-3 py-2 font-medium">{c.category}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{c.total_qty}</td>
                    <td className="px-3 py-2 text-left font-semibold">{formatCurrency(c.total_cost)}</td>
                    <td className="px-3 py-2 text-left font-semibold">{formatCurrency(c.total_retail)}</td>
                    <td className="px-3 py-2 text-left font-semibold text-green-600">{formatCurrency(c.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly purchases */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">المشتريات الشهرية</h2>
            <select value={monthsCount} onChange={(e) => setMonthsCount(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white">
              <option value={3}>3 أشهر</option>
              <option value={6}>6 أشهر</option>
              <option value={12}>12 شهر</option>
              <option value={24}>24 شهر</option>
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="text-right px-3 py-2">الشهر</th>
                <th className="text-center px-3 py-2">الفواتير</th>
                <th className="text-left px-3 py-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((m) => (
                <tr key={m.month}>
                  <td className="px-3 py-2 font-medium">{m.month}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{m.invoices_count}</td>
                  <td className="px-3 py-2 text-left font-semibold">{formatCurrency(m.total_amount)}</td>
                </tr>
              ))}
              {months.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-slate-400">لا توجد فواتير</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sales Analytics */}
        {sales && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">المبيعات</h2>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-green-600">إجمالي المبيعات</p>
                <p className="text-lg font-extrabold text-green-700">{formatCurrency(sales.total_sales)}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">صافي الربح</p>
                <p className="text-lg font-extrabold text-blue-700">{formatCurrency(sales.total_profit)}</p>
              </div>
            </div>
            <h3 className="mb-2 text-sm font-bold text-slate-700">الأدوية الأكثر طلباً</h3>
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="text-right px-3 py-2">الدواء</th>
                  <th className="text-center px-3 py-2">الكمية</th>
                  <th className="text-left px-3 py-2">الإيراد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.top_drugs.map((d) => (
                  <tr key={d.name}>
                    <td className="px-3 py-2 font-medium">{d.name}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{d.quantity}</td>
                    <td className="px-3 py-2 text-left font-semibold">{formatCurrency(d.revenue)}</td>
                  </tr>
                ))}
                {sales.top_drugs.length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-slate-400">لا توجد مبيعات بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
