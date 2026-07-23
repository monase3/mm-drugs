"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const YEMEN_CITIES = [
  "صنعاء",
  "عدن",
  "تعز",
  "الحديدة",
  "إب",
  "ذمار",
  "المكلا",
  "مأرب",
  "سيئون",
  "صعدة",
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"pharmacy_owner" | "supplier">("pharmacy_owner");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [city, setCity] = useState(YEMEN_CITIES[0]);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("15.3694");
  const [longitude, setLongitude] = useState("44.1910");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ apiKey: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(pos.coords.latitude.toFixed(6));
      setLongitude(pos.coords.longitude.toFixed(6));
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { fullName, email, phone, password, role };
      if (role === "pharmacy_owner") {
        payload.pharmacy = {
          name: pharmacyName,
          licenseNumber,
          city,
          address,
          latitude: Number(latitude),
          longitude: Number(longitude),
        };
      }
      if (role === "supplier") {
        payload.companyName = companyName;
        payload.city = city;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "حدث خطأ أثناء إنشاء الحساب");
        return;
      }

      if (data.apiKey) {
        setSuccess({ apiKey: data.apiKey });
        return;
      }
      router.push(role === "supplier" ? "/supplier" : "/dashboard");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-b from-teal-50 to-white px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-teal-100 text-3xl">✅</div>
          <h1 className="text-2xl font-extrabold text-slate-900">تم إنشاء الحساب بنجاح</h1>
          <p className="mt-2 text-sm text-slate-500">
            {role === "supplier"
              ? "يمكنك الآن تسجيل الدخول والبدء في إضافة منتجاتك."
              : "احتفظ بمفتاح API الخاص بصيدليتك — ستحتاجه لربط نظام نقاط البيع مع منصة MM Drugs."}
          </p>
          {success.apiKey && (
            <div className="mt-6 rounded-xl bg-slate-900 p-4 text-left">
              <code dir="ltr" className="break-all text-sm text-teal-300">{success.apiKey}</code>
            </div>
          )}
          <Link href={role === "supplier" ? "/supplier" : "/dashboard"} className="mt-6 inline-block w-full rounded-lg bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700">
            الانتقال إلى لوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-teal-50 to-white px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-extrabold text-teal-700">MM درجز</Link>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">إنشاء حساب جديد</h1>
          <p className="mt-1 text-sm text-slate-500">انضم إلى منصة MM Drugs كصيدلية أو كمورد</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("pharmacy_owner")}
            className={`rounded-xl border-2 p-4 text-sm font-bold transition ${
              role === "pharmacy_owner"
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-500"
            }`}
          >
            🏥 صاحب صيدلية
          </button>
          <button
            type="button"
            onClick={() => setRole("supplier")}
            className={`rounded-xl border-2 p-4 text-sm font-bold transition ${
              role === "supplier"
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-500"
            }`}
          >
            📦 مورد
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الاسم الكامل</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">رقم الهاتف</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="7xxxxxxxx" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">كلمة المرور</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            </div>
          </div>

          {role === "pharmacy_owner" && (
            <div className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <h2 className="text-sm font-bold text-teal-800">بيانات الصيدلية</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">اسم الصيدلية</label>
                  <input required value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">رقم الترخيص</label>
                  <input required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} dir="ltr" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">المدينة</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                    {YEMEN_CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">العنوان</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">الموقع الجغرافي</label>
                  <button type="button" onClick={useMyLocation} className="text-xs font-bold text-teal-700 hover:underline">📍 استخدام موقعي</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input required dir="ltr" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  <input required dir="ltr" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                </div>
              </div>
            </div>
          )}

          {role === "supplier" && (
            <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <h2 className="text-sm font-bold text-blue-800">بيانات المورد</h2>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">اسم الشركة / المورد</label>
                <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="مثال: شركة الأدوية اليمنية" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">المدينة</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                  {YEMEN_CITIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-teal-600 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60">
            {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
