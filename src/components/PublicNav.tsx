import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export async function PublicNav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-teal-700">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white">
            💊
          </span>
          <span>
            MM <span className="text-slate-900">درجز</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#features" className="hover:text-teal-700">
            المزايا
          </Link>
          <Link href="/docs" className="hover:text-teal-700">
            توثيق الواجهة البرمجية
          </Link>
          <Link href="/#for-citizens" className="hover:text-teal-700">
            للمواطنين
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-teal-600 text-white text-sm font-bold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {user.fullName}
                </span>
              </div>

              <span className="hidden rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
                {user.role === "pharmacy_owner" && "صاحب صيدلية"}
                {user.role === "admin" && "مشرف"}
                {user.role === "supplier" && "مورد"}
                {user.role === "pharmacy_staff" && "موظف"}
                {user.role === "citizen" && "مواطن"}
              </span>

              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-200 transition"
                >
                  تسجيل الخروج
                </button>
              </form>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-200 hover:bg-teal-700"
              >
                سجّل صيدليتك
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
