"use client";

import { useCallback, useEffect, useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceId: string | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  new_order: "🛒",
  order_confirmed: "✅",
  order_shipped: "🚚",
  order_delivered: "📦",
  order_cancelled: "❌",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (data.ok) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">الإشعارات</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات جديدة"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">جارٍ التحميل...</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg text-slate-400">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                n.isRead ? "border-slate-200 bg-white" : "border-teal-200 bg-teal-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xl">{typeIcons[n.type] || "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.isRead ? "font-medium text-slate-600" : "font-bold text-slate-900"}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString("ar-YE")} — {new Date(n.createdAt).toLocaleTimeString("ar-YE")}
                  </p>
                </div>
                {!n.isRead && (
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
