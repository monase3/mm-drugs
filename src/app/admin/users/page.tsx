"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  pharmacy_name: string | null;
}

const roleLabels: Record<string, string> = {
  citizen: "مواطن",
  pharmacy_owner: "صاحب صيدلية",
  pharmacy_staff: "موظف",
  supplier: "مورد",
  admin: "مشرف",
};

const roleColors: Record<string, string> = {
  citizen: "bg-slate-100 text-slate-700",
  pharmacy_owner: "bg-teal-100 text-teal-800",
  pharmacy_staff: "bg-amber-100 text-amber-800",
  supplier: "bg-purple-100 text-purple-800",
  admin: "bg-rose-100 text-rose-800",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUsers(d.users);
        else setError(d.error);
      })
      .catch(() => setError("فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  }, []);

  async function changeRole(id: string, role: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  if (loading) return <div className="text-center py-20 text-slate-500">جارٍ التحميل...</div>;
  if (error) return <div className="text-center py-20 text-rose-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">إدارة المستخدمين</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3">الاسم</th>
              <th className="text-right px-4 py-3">البريد</th>
              <th className="text-right px-4 py-3">الجوال</th>
              <th className="text-center px-4 py-3">الدور</th>
              <th className="text-center px-4 py-3">تغيير الدور</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  {u.full_name}
                  {u.pharmacy_name && (
                    <div className="text-xs text-slate-400">{u.pharmacy_name}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-slate-500">{u.phone ?? "-"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${roleColors[u.role] ?? "bg-slate-100"}`}>
                    {roleLabels[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                  >
                    {Object.entries(roleLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  لا يوجد مستخدمون
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
