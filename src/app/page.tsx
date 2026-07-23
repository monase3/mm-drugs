import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: "🗺️",
    title: "بحث ذكي بالموقع الجغرافي",
    desc: "تقنية PostGIS تحدد أقرب الصيدليات المتوفر لديها الدواء المطلوب خلال أجزاء من الثانية.",
  },
  {
    icon: "🔄",
    title: "مزامنة فورية مع نقاط البيع",
    desc: "واجهة برمجية موحّدة تتيح لأنظمة نقاط البيع المحلية رفع تحديثات المخزون بشكل جماعي وآمن.",
  },
  {
    icon: "📦",
    title: "إدارة المخزون والفواتير",
    desc: "لوحة تحكم شاملة للصيدليات لإدارة الأدوية، المخزون، الموردين، وفواتير المشتريات.",
  },
  {
    icon: "🔐",
    title: "أمان وموثوقية",
    desc: "مصادقة عبر JWT ومفاتيح API مخصصة لكل صيدلية لضمان أمان البيانات وسرية المعاملات.",
  },
  {
    icon: "📱",
    title: "تطبيق للمواطنين",
    desc: "تطبيق موبايل بواجهة عربية كاملة يساعد المواطن على إيجاد دواءه في أقرب صيدلية بسرعة.",
  },
  {
    icon: "📊",
    title: "تقارير وإحصائيات",
    desc: "رؤية واضحة لحركة المخزون والمشتريات تساعد أصحاب الصيدليات على اتخاذ قرارات أفضل.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white">
      <PublicNav />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center md:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-4 py-1.5 text-sm font-semibold text-teal-800">
            منصة رقمية شاملة لقطاع الأدوية في اليمن
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">
            أدويتك بين يديك، أينما كنت
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            MM Drugs تربط الصيدليات والموزعين والمواطنين في منظومة واحدة: بحث فوري عن الأدوية
            القريبة، إدارة ذكية للمخزون، ومزامنة مباشرة مع أنظمة نقاط البيع المحلية.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-teal-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-200 transition hover:bg-teal-700"
            >
              ابدأ الآن — سجّل صيدليتك مجاناً
            </Link>
            <Link
              href="/docs"
              className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-bold text-slate-800 transition hover:border-teal-400 hover:text-teal-700"
            >
              توثيق واجهة المزامنة (POS API)
            </Link>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900">لماذا MM Drugs؟</h2>
            <p className="mt-3 text-slate-600">كل ما تحتاجه صيدليتك، ومنظومة الدواء الوطنية، في مكان واحد.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-2xl">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="for-citizens"
          className="mx-auto my-16 max-w-6xl overflow-hidden rounded-3xl bg-teal-700 px-8 py-14 text-white md:px-16"
        >
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold">تطبيق المواطنين متوفر على هاتفك</h2>
              <p className="mt-4 text-teal-50">
                ابحث عن أي دواء بالاسم، وشاهد فوراً أقرب الصيدليات التي تتوفر فيها الكمية المطلوبة،
                مع السعر والمسافة واتجاهات الوصول — كل ذلك بواجهة عربية أنيقة وسهلة الاستخدام.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span>✅</span> بحث فوري بالاسم التجاري أو العلمي للدواء
                </li>
                <li className="flex items-center gap-2">
                  <span>✅</span> ترتيب النتائج حسب الأقرب إلى موقعك
                </li>
                <li className="flex items-center gap-2">
                  <span>✅</span> عرض السعر والكمية المتوفرة لحظياً
                </li>
              </ul>
            </div>
            <div className="mx-auto w-full max-w-xs rounded-[2.5rem] border-8 border-teal-900/40 bg-teal-800 p-4 shadow-2xl">
              <div className="rounded-3xl bg-white p-4 text-slate-900">
                <p className="text-center text-xs font-bold text-teal-700">تطبيق MM Drugs</p>
                <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                  🔍 ابحث عن اسم الدواء...
                </div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold">صيدلية النور</p>
                    <p className="text-xs text-slate-500">0.8 كم — متوفر 24 علبة</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-bold">صيدلية الشفاء</p>
                    <p className="text-xs text-slate-500">1.4 كم — متوفر 10 علبة</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 md:flex-row">
          <p>© {new Date().getFullYear()} MM Drugs — جميع الحقوق محفوظة.</p>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-teal-700">
              توثيق المطورين
            </Link>
            <Link href="/login" className="hover:text-teal-700">
              دخول الصيدليات
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
