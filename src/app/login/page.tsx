"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "حدث خطأ أثناء تسجيل الدخول");
        return;
      }
      const role = data.user?.role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "supplier") {
        router.push("/supplier");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-teal-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-extrabold text-teal-700">
            MM درجز
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-slate-500">أدخل بياناتك للوصول إلى لوحة التحكم</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="example@pharmacy.ye"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="font-semibold text-teal-700 hover:underline">
            سجّل الآن
          </Link>
        </p>
      </div>
    </div>
  );
}
