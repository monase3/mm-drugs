"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
}

const actionLabels: Record<string, string> = {
  "pharmacy.toggle_active": "تفعيل/تعطيل صيدلية",
  "pharmacy.update": "تحديث بيانات صيدلية",
  "user.change_role": "تغيير صلاحية مستخدم",
  "drug.create": "إضافة دواء",
  "drug.update": "تعديل دواء",
  "drug.delete": "حذف دواء",
  "api_key.regenerate": "إعادة توليد مفتاح API",
  "api_key.revoke": "سحب مفتاح API",
};

const actionColors: Record<string, string> = {
  "pharmacy.toggle_active": "bg-amber-100 text-amber-800",
  "pharmacy.update": "bg-blue-100 text-blue-800",
  "user.change_role": "bg-purple-100 text-purple-800",
  "drug.create": "bg-emerald-100 text-emerald-800",
  "drug.update": "bg-teal-100 text-teal-800",
  "drug.delete": "bg-rose-100 text-rose-800",
  "api_key.regenerate": "bg-orange-100 text-orange-800",
  "api_key.revoke": "bg-red-100 text-red-800",
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit-log")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setLogs(d.logs); setTotal(d.total); }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center text-slate-500">جارٍ التحميل...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">سجل النشاطات</h1>
        <p className="mt-1 text-sm text-slate-500">{total} إجراء مسجل</p>
      </div>

      <div className="space-y-3">
        {logs.map((log) => {
          let detailsText = "";
          try {
            const d = log.details ? JSON.parse(log.details) : null;
            detailsText = d ? JSON.stringify(d) : "";
          } catch { detailsText = log.details ?? ""; }

          return (
            <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                  actionColors[log.action] ?? "bg-slate-100 text-slate-700"
                }`}>
                  {actionLabels[log.action] ?? log.action}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">{log.admin_name ?? log.admin_email}</span>
                {" — "}
                {log.entity_type === "pharmacy" && "صيدلية"}
                {log.entity_type === "user" && "مستخدم"}
                {log.entity_type === "drug" && "دواء"}
                {log.entity_type === "api_key" && "مفتاح API"}
                {log.entity_id && (
                  <span className="mr-1 text-xs text-slate-400">(ID: {log.entity_id.slice(0, 8)}…)</span>
                )}
              </div>
              {detailsText && (
                <div className="mt-1 text-xs text-slate-400 font-mono" dir="ltr">{detailsText}</div>
              )}
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="py-10 text-center text-slate-400">لا توجد إجراءات مسجلة بعد</div>
        )}
      </div>
    </div>
  );
}
