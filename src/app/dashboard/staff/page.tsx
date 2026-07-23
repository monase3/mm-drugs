"use client";

import { useCallback, useEffect, useState } from "react";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fError, setFError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard/staff");
    const d = await res.json();
    if (d.ok) setStaff(d.staff);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFError(null);
    const res = await fetch("/api/dashboard/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: fName, email: fEmail, phone: fPhone, password: fPassword }),
    });
    const d = await res.json();
    setSaving(false);
    if (!d.ok) { setFError(d.error); return; }
    setShowForm(false);
    setFName(""); setFEmail(""); setFPhone(""); setFPassword("");
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`حذف الموظف "${name}"؟`)) return;
    await fetch(`/api/dashboard/staff?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="py-20 text-center text-slate-500">جارٍ التحميل...</div>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">إدارة الموظفين</h1>
          <p className="mt-1 text-sm text-slate-500">{staff.length} موظف</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700">
          + إضافة موظف
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">إضافة موظف جديد</h2>
          {fError && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{fError}</div>}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">الاسم *</label>
              <input required value={fName} onChange={(e) => setFName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">البريد *</label>
              <input required type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">الجوال</label>
              <input value={fPhone} onChange={(e) => setFPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">كلمة المرور *</label>
              <input required type="password" value={fPassword} onChange={(e) => setFPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button type="submit" disabled={saving}
                className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving ? "جارٍ الحفظ..." : "إضافة"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3">الاسم</th>
              <th className="text-right px-4 py-3">البريد</th>
              <th className="text-right px-4 py-3">الجوال</th>
              <th className="text-right px-4 py-3">تاريخ الإضافة</th>
              <th className="text-center px-4 py-3">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 text-slate-500" dir="ltr">{s.email}</td>
                <td className="px-4 py-3 text-slate-500">{s.phone ?? "-"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(s.created_at).toLocaleDateString("ar-YE")}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleDelete(s.id, s.full_name)}
                    className="text-xs font-bold text-rose-600 hover:underline">
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-slate-400">لا يوجد موظفون</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
