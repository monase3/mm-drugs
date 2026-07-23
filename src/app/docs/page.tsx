import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";

export const metadata = {
  title: "توثيق واجهة MM Drugs البرمجية",
};

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <pre
      dir="ltr"
      className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-left text-xs leading-relaxed text-teal-200 md:text-sm"
    >
      <code data-lang={lang}>{code}</code>
    </pre>
  );
}

const syncRequestExample = `POST /api/pos/sync HTTP/1.1
Host: mm-drugs.example.com
Content-Type: application/json
X-API-Key: mmd_7f1a9c2e4b6d8f0a1c3e5b7d9f0a1c3e

{
  "items": [
    {
      "barcode": "6291041500213",
      "name": "باراسيتامول 500 ملغ",
      "genericName": "Paracetamol",
      "manufacturer": "الشركة اليمنية للأدوية",
      "unit": "شريط",
      "quantity": 120,
      "price": 350.00,
      "expiryDate": "2027-05-01",
      "batchNumber": "B-2025-114"
    },
    {
      "barcode": "6291041500220",
      "name": "أموكسيسيلين 500 ملغ كبسول",
      "genericName": "Amoxicillin",
      "manufacturer": "شركة الأدوية المتحدة",
      "unit": "علبة",
      "quantity": 45,
      "price": 1200.00,
      "expiryDate": "2026-11-15",
      "batchNumber": "B-2025-098"
    }
  ]
}`;

const syncResponseExample = `{
  "ok": true,
  "message": "تمت مزامنة المخزون بنجاح",
  "pharmacy": { "id": "b2f1...e91a", "name": "صيدلية النور" },
  "summary": { "total": 2, "created": 1, "updated": 1, "failed": 0 },
  "results": [
    { "name": "باراسيتامول 500 ملغ", "status": "updated" },
    { "name": "أموكسيسيلين 500 ملغ كبسول", "status": "created" }
  ]
}`;

const curlExample = `curl -X POST "https://mm-drugs.example.com/api/pos/sync" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: mmd_7f1a9c2e4b6d8f0a1c3e5b7d9f0a1c3e" \\
  -d '{
        "items": [
          {
            "barcode": "6291041500213",
            "name": "باراسيتامول 500 ملغ",
            "quantity": 120,
            "price": 350.00,
            "expiryDate": "2027-05-01",
            "batchNumber": "B-2025-114"
          }
        ]
      }'`;

const errorExample = `{
  "ok": false,
  "error": "مفتاح API غير صالح"
}`;

const nearbyExample = `GET /api/drugs/nearby?drugName=باراسيتامول&lat=15.3694&lng=44.1910&radiusKm=5

{
  "ok": true,
  "count": 2,
  "results": [
    {
      "pharmacyId": "b2f1...e91a",
      "pharmacyName": "صيدلية النور",
      "city": "صنعاء",
      "phone": "777123456",
      "latitude": 15.371,
      "longitude": 44.193,
      "drugName": "باراسيتامول 500 ملغ",
      "unit": "شريط",
      "quantity": 120,
      "price": 350,
      "distanceMeters": 812
    }
  ]
}`;

const loginExample = `curl -X POST "https://mm-drugs.example.com/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "owner@pharmacy.ye", "password": "••••••••" }'`;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12">
        <aside className="sticky top-24 hidden h-fit w-56 shrink-0 space-y-1 text-sm md:block">
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            المحتويات
          </p>
          {[
            ["overview", "نظرة عامة"],
            ["auth", "المصادقة"],
            ["pos-sync", "مزامنة نقاط البيع"],
            ["nearby", "البحث عن دواء قريب"],
            ["errors", "رموز الأخطاء"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="block rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-700"
            >
              {label}
            </a>
          ))}
        </aside>

        <main className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900">توثيق واجهة MM Drugs البرمجية</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            دليل شامل لمطوري أنظمة نقاط البيع (POS) والشركاء التقنيين لربط أنظمتهم مع منصة MM
            Drugs، بما يشمل مزامنة المخزون والبحث الجغرافي عن الأدوية.
          </p>

          <section id="overview" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900">نظرة عامة</h2>
            <p className="mt-3 text-slate-600">
              جميع نقاط النهاية مبنية على معايير REST وتتبادل البيانات بصيغة JSON. الرابط الأساسي
              للواجهة البرمجية هو نطاق نشر التطبيق، ويكون شكل الاستجابة الموحد كالتالي:
            </p>
            <CodeBlock
              lang="json"
              code={`{
  "ok": true | false,
  ...البيانات أو رسالة الخطأ
}`}
            />
          </section>

          <section id="auth" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900">المصادقة (Auth)</h2>
            <p className="mt-3 text-slate-600">
              تستخدم لوحة التحكم والتطبيقات مصادقة عبر <strong>JWT</strong> يتم إصداره عند تسجيل
              الدخول ({" "}
              <code dir="ltr">POST /api/auth/login</code>) أو التسجيل ({" "}
              <code dir="ltr">POST /api/auth/register</code>). يُخزَّن الرمز في كوكي HttpOnly
              للوحة التحكم، أو يمكن إرساله كـ <code dir="ltr">Authorization: Bearer &lt;token&gt;</code>
              {" "}للتطبيقات الخارجية.
            </p>
            <CodeBlock lang="bash" code={loginExample} />
            <p className="mt-4 text-slate-600">
              أما أنظمة نقاط البيع المحلية فتستخدم آلية مصادقة أبسط ومخصصة لها:{" "}
              <strong>مفتاح API</strong> فريد لكل صيدلية (يظهر في لوحة التحكم ← الإعدادات)، يُرسل
              عبر رأس الطلب <code dir="ltr">X-API-Key</code>.
            </p>
          </section>

          <section id="pos-sync" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900">مزامنة المخزون من نقاط البيع</h2>
            <p className="mt-3 text-slate-600">
              نقطة النهاية <code dir="ltr">POST /api/pos/sync</code> مخصصة لأنظمة نقاط البيع
              المحلية لدفع تحديثات المخزون بشكل جماعي (Bulk) بشكل آمن وسريع. يوصى باستدعائها دورياً
              (كل 5–15 دقيقة) أو عند كل عملية بيع مؤثرة على المخزون.
            </p>

            <h3 className="mt-6 font-bold text-slate-800">المصادقة</h3>
            <p className="mt-2 text-slate-600">
              أرسل رأس الطلب <code dir="ltr">X-API-Key</code> بقيمة مفتاح API الخاص بصيدليتك.
            </p>

            <h3 className="mt-6 font-bold text-slate-800">مثال على الطلب</h3>
            <CodeBlock lang="http" code={syncRequestExample} />

            <h3 className="mt-6 font-bold text-slate-800">حقول كل عنصر (item)</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">الحقل</th>
                    <th className="px-4 py-2 font-semibold">النوع</th>
                    <th className="px-4 py-2 font-semibold">إلزامي</th>
                    <th className="px-4 py-2 font-semibold">الوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["name", "string", "نعم", "الاسم التجاري للدواء"],
                    ["barcode", "string", "لا", "الباركود؛ يُستخدم لمطابقة الدواء بدقة"],
                    ["genericName", "string", "لا", "الاسم العلمي للمادة الفعالة"],
                    ["manufacturer", "string", "لا", "الشركة المصنّعة"],
                    ["unit", "string", "لا", "وحدة القياس، مثل: علبة، شريط (افتراضي: علبة)"],
                    ["quantity", "number", "نعم", "الكمية المتوفرة حالياً (0 أو أكبر)"],
                    ["price", "number", "نعم", "سعر البيع للوحدة الواحدة"],
                    ["expiryDate", "string", "لا", "تاريخ انتهاء الصلاحية بصيغة YYYY-MM-DD"],
                    ["batchNumber", "string", "لا", "رقم التشغيلة (افتراضي: GENERAL)"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, i) => (
                        <td key={i} className={`px-4 py-2 ${i === 0 ? "font-mono text-teal-700" : "text-slate-600"}`} dir={i === 0 ? "ltr" : undefined}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 font-bold text-slate-800">مثال على الاستجابة الناجحة</h3>
            <CodeBlock lang="json" code={syncResponseExample} />

            <h3 className="mt-6 font-bold text-slate-800">مثال cURL</h3>
            <CodeBlock lang="bash" code={curlExample} />

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>ملاحظة:</strong> الحد الأقصى لعدد العناصر في الطلب الواحد هو 2000 صنف. لأي
              عدد أكبر، يُرجى تقسيم الطلب إلى دفعات متعددة.
            </div>
          </section>

          <section id="nearby" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900">البحث عن دواء في أقرب صيدلية</h2>
            <p className="mt-3 text-slate-600">
              تُستخدم هذه النقطة من تطبيق المواطنين للبحث عن دواء ضمن نطاق جغرافي محدد، باستخدام
              استعلام PostGIS محسّن (<code dir="ltr">ST_DWithin</code>) على فهرس مكاني (GiST).
            </p>
            <h3 className="mt-6 font-bold text-slate-800">
              <code dir="ltr">GET /api/drugs/nearby</code>
            </h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">المعامل</th>
                    <th className="px-4 py-2 font-semibold">الوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2 font-mono text-teal-700" dir="ltr">drugName</td>
                    <td className="px-4 py-2 text-slate-600">جزء من اسم الدواء المطلوب (مطابقة تقريبية)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-teal-700" dir="ltr">lat, lng</td>
                    <td className="px-4 py-2 text-slate-600">إحداثيات موقع المستخدم الحالي</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-teal-700" dir="ltr">radiusKm</td>
                    <td className="px-4 py-2 text-slate-600">نطاق البحث بالكيلومترات (افتراضي: 10، الحد الأقصى: 100)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <CodeBlock lang="http" code={nearbyExample} />
          </section>

          <section id="errors" className="mt-10 scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900">رموز الأخطاء الشائعة</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">الرمز</th>
                    <th className="px-4 py-2 font-semibold">المعنى</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["400", "طلب غير صالح — تحقق من صيغة البيانات المرسلة"],
                    ["401", "غير مصرح — مفتاح API أو رمز الدخول مفقود/غير صالح"],
                    ["403", "الحساب أو الصيدلية غير مفعّلة"],
                    ["404", "المورد المطلوب غير موجود"],
                    ["422", "فشل التحقق من صحة البيانات (راجع حقل details في الاستجابة)"],
                    ["500", "خطأ غير متوقع في الخادم"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <td className="px-4 py-2 font-mono text-rose-600" dir="ltr">{row[0]}</td>
                      <td className="px-4 py-2 text-slate-600">{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock lang="json" code={errorExample} />
          </section>

          <div className="mt-12 rounded-2xl bg-teal-50 p-6 text-center">
            <p className="text-slate-700">هل تحتاج مساعدة في الربط التقني؟</p>
            <Link href="/register" className="mt-3 inline-block font-bold text-teal-700 hover:underline">
              سجّل صيدليتك واحصل على مفتاح API فوراً ←
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
