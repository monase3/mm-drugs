import os
from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

doc = Document()

# ---- Default font ----
style = doc.styles['Normal']
font = style.font
font.name = 'Segoe UI'
font.size = Pt(11)

# ---- Title ----
title = doc.add_heading('MM Drugs', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('أدوية اليمن - مشروع نظام إدارة صيدليات إلكتروني')
run.font.size = Pt(16)
run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = meta.add_run('تقرير شامل بحالة المشروع والمميزات')
run.font.size = Pt(14)
run.font.bold = True
run.font.color.rgb = RGBColor(0x33, 0x66, 0x99)

doc.add_paragraph()
meta2 = doc.add_paragraph()
meta2.alignment = WD_ALIGN_PARAGRAPH.CENTER
run2 = meta2.add_run('التاريخ: سبتمبر 2025 | المطور: za3blawy | المستوى: انتاجي جاهز')
run2.font.size = Pt(10)
run2.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

doc.add_page_break()

# ===== SECTION 1 =====
doc.add_heading('1. نظرة عامة على المشروع', level=1)
p = doc.add_paragraph()
p.add_run('MM Drugs (ادوية اليمن)').bold = True
p.add_run(' هو نظام إدارة صيدليات ائتماني شامل - منصة ويب كاملة تربط بين:')

items = [
    'المواطنين (العملاء) - البحث عن الادوية وطلبها من الصيدليات القريبة',
    'اصحاب الصيدليات - إدارة المخزون والمبيعات والطلبات',
    'الموردين - بيع الادوية لصيدليات متعددة عبر سوق ائتماني',
    'المشرفين - إدارة المنصة بالكامل'
]
for item in items:
    doc.add_paragraph(item, style='List Bullet')

p2 = doc.add_paragraph()
p2.add_run('المشروع مصمم كمنصة SaaS متكاملة تعمل كنظام نقاط بيع (POS) + سوق موردين + نظام طلبات + نظام تقييمات.')

doc.add_page_break()

# ===== SECTION 2: Tech Stack =====
doc.add_heading('2. البنية التقنية', level=1)
doc.add_heading('المكونات الرئيسية', level=2)

table = doc.add_table(rows=1, cols=3)
table.style = 'Medium Shading 1 Accent 1'
hdr = table.rows[0].cells
hdr[0].text = 'المكون'
hdr[1].text = 'التقنية'
hdr[2].text = 'الاصدار'

tech_data = [
    ('الباك اند', 'Next.js (App Router)', '16.2.6'),
    ('اللغة', 'TypeScript', '5.9.3'),
    ('الويب فروتند', 'React + TailwindCSS', 'React 19, Tailwind 4.1'),
    ('قاعدة البيانات', 'PostgreSQL + PostGIS', 'Neon Cloud'),
    ('ORM', 'Drizzle ORM', '0.45.2'),
    ('المصادقة', 'JWT + bcrypt', '-'),
    ('التحقق من البيانات', 'Zod', '4.4.3'),
    ('التطبيق الموبايل', 'Flutter (Dart)', '-'),
    ('اداة الربط (POS)', 'Node.js + Axios', '-'),
    ('النشر', 'Vercel', '-'),
]
for name, tech, ver in tech_data:
    row = table.add_row().cells
    row[0].text = name
    row[1].text = tech
    row[2].text = ver

doc.add_page_break()

# ===== SECTION 3: Features =====
doc.add_heading('3. المميزات الكاملة للمشروع', level=1)

# 3.1
doc.add_heading('3.1 نظام المصادقة والصلاحيات', level=2)
auth_features = [
    '5 ادوار مستخدمين: مواطن، صاحب صيدلية، موظف، مورد، مشرف',
    'تسجيل ودخول بالبريد الإلكتروني مع JWT',
    'كلمة المرور مشفرة بـ bcrypt',
    'جلسات cookie httpOnly (7 أيام صلاحية)',
    'Bearer Token للاستخدام في API والأدوات الخارجية',
    'مفتاح API لكل صيدلية (لربط POS)'
]
for f in auth_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.2
doc.add_heading('3.2 إدارة الصيدليات', level=2)
pharm_features = [
    'تسجيل صيدلية بالاسم، الرخصة، المدينة، العنوان',
    'إحداثيات جغرافية PostGIS (نقطة على الخريطة)',
    'مفتاح API تلقائي لكل صيدلية (لربط أنظمة POS)',
    'تفعيل/تعطيل من لوحة المشرف',
    'البحث القريب ST_DWithin للبحث عن الصيدليات القريبة',
    'ملف الصيدلية كامل (اسم، رخصة، عنوان، إحداثيات، هاتف)'
]
for f in pharm_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.3
doc.add_heading('3.3 إدارة الادوية والمخزون', level=2)
drug_features = [
    'قاعدة بيانات الادوية: اسم، اسم عام، شركة مصنعة، فئة',
    'الباركود فريد لكل دواء',
    'المخزون لكل صيدلية: كمية، سعر التكلفة، سعر البيع',
    'الدفعات (Batches): رقم دفعة، تاريخ انتهاء',
    'الحد الأدنى للمخزون مع تنبيه عند نفاده',
    'حركات المخزون: شراء، بيع، هدر، تعديل، إرجاع، تحويل',
    'السجل الكامل لكل حركة مع السبب والمستخدم'
]
for f in drug_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.4
doc.add_heading('3.4 نظام الطلبات والمشتريات', level=2)
order_features = [
    'طلبات المواطنين: مواطن يطلب دواء من صيدلية قريبة',
    'طلبات الموردين: صيدلية تطلب من مورد عبر السوق',
    'فواتير الشراء لكل طلب مع المنتجات والكميات',
    'حالة الطلب: معلق، مؤكد، مشحون، مسلم، ملغي، منتهي',
    'نظام التقييم: تقييم الموردين والصيدليات'
]
for f in order_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.5
doc.add_heading('3.5 سوق الموردين (Supplier Marketplace)', level=2)
marketplace_features = [
    'منتجات الموردين: كل مورد يعرض ادوية باسعاره',
    'الاسعار التنافسية مع مقارنة بين الموردين',
    'الحد الادنى للطلب لكل منتج',
    'حالة التوفر: متوفر أو غير متوفر',
    'طلبات الشراء: صيدلية تطلب من مورد محدد'
]
for f in marketplace_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.6
doc.add_heading('3.6 لوحة التحكم الادارية (Admin Panel)', level=2)
admin_features = [
    'إدارة المستخدمين: عرض، تعديل الادوار، حذف',
    'إدارة الصيدليات: تفعيل/تعطيل، مراجعة الطلبات',
    'إدارة الادوية: اضافة/تعديل/حذف',
    'لوحة التقارير: تقارير المبيعات والتحليلات',
    'سجل التدقيق: سجل كامل لكل التغييرات',
    'طلبات الصيدليات: مراجعة وموافقة/رفض',
    'إدارة API Keys: انشاء وتجديد وإلغاء'
]
for f in admin_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.7
doc.add_heading('3.7 البحث والجغرافيا', level=2)
search_features = [
    'بحث الادوية بالقرب باستخدام ST_DWithin (PostGIS)',
    'فهرس التماثل الجزئي pg_trgm للبحث السريع',
    'خريطة الصيدليات مع إحداثيات PostGIS',
    'فرز حسب القرب - المسافة الجغرافية'
]
for f in search_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.8
doc.add_heading('3.8 نظام POS Bridge', level=2)
pos_features = [
    'ربط أنظمة نقاط البيع المحلية بالمخزون الإلكتروني',
    'مزامنة المخزون عبر POST /api/pos/sync',
    'مصادقة بـ X-API-Key header',
    'تقرير المزامنة: إجمالي، تم الإنشاء، التحديث، الفشل'
]
for f in pos_features:
    doc.add_paragraph(f, style='List Bullet')

# 3.9
doc.add_heading('3.9 التطبيق الموبايل (Flutter)', level=2)
mobile_features = [
    'واجهة مستخدم تطبيق Android كامل',
    'اتصال بـ REST API عبر HTTP',
    'إعداد الخادم قابل للتعديل (baseUrl)',
    'دعم Cleartext للتطوير المحلي',
    'خرائط Google مع مفتاح API'
]
for f in mobile_features:
    doc.add_paragraph(f, style='List Bullet')

doc.add_page_break()

# ===== SECTION 4: Status =====
doc.add_heading('4. حالة التطوير الحالية', level=1)

doc.add_heading('المكتمل بالكامل', level=2)
completed = [
    'هيكل قاعدة البيانات - 13 جدول كاملة',
    'المصادقة والتسجيل - JWT + bcrypt',
    'ادارة المستخدمين (Admin)',
    'ادارة الصيدليات (Admin)',
    'ادارة الادوية (Admin)',
    'المخزون الأساسي وحركات المخزون',
    'فواتير الشراء',
    'سوق الموردين وأوامر الشراء',
    'نظام التقييمات',
    'طلبات المواطنين',
    'تقييمات الصيدليات',
    'نظام الاشعارات',
    'البحث الجغرافي (PostGIS)',
    'لوحة المشرف',
    'POS Bridge',
    'التطبيق الموبايل (Flutter - اساسي)',
    'API Key Authentication',
    'سجل التدقيق',
    'التوثيق الكامل',
    'النشر على Vercel'
]
for f in completed:
    doc.add_paragraph('✅ ' + f, style='List Bullet')

doc.add_heading('جاري التطوير أو مخطط لها', level=2)
planned = [
    'لوحة تقارير متقدمة مع مخططات بيانية',
    'نظام الدفع الإلكتروني (PayPal, Stripe)',
    'اشعارات فورية (WebSocket / Push)',
    'لوحة تحكم متقدمة للمواطن',
    'تقارير احصائية ورسوم بيانية',
    'نسخة انجليزية',
    'نظام التوصيل مع التتبع',
    'نظام المحادثة',
    'نظام العروض والخصومات',
    'تطبيق iOS',
    'نظام استرداد كلمة المرور',
    'نظام الإحالة (Referral)'
]
for f in planned:
    doc.add_paragraph('🔄 ' + f, style='List Bullet')

doc.add_page_break()

# ===== SECTION 5: Cost =====
doc.add_heading('5. التكلفة التقديرية للإطلاق', level=1)

doc.add_heading('المرحلة الأولى - Vercel (مجاني)', level=2)
t1 = doc.add_table(rows=1, cols=2)
t1.style = 'Light Grid Accent 1'
t1.rows[0].cells[0].text = 'البند'
t1.rows[0].cells[1].text = 'التكلفة'
for k, v in [('الاستضافة', '🆓 مجاني'), ('قاعدة البيانات (Neon)', '🆓 مجاني'), ('الإجمالي الشهري', '🆓 $0')]:
    row = t1.add_row().cells
    row[0].text = k
    row[1].text = v

doc.add_paragraph()

doc.add_heading('المرحلة الثانية - Railway (اداء كامل)', level=2)
t2 = doc.add_table(rows=1, cols=2)
t2.style = 'Light Grid Accent 1'
t2.rows[0].cells[0].text = 'البند'
t2.rows[0].cells[1].text = 'التكلفة'
for k, v in [('استضافة Railway Hobby', '💵 $5/شهر'), ('الدومين (.com)', '💵 ~$10/سنة'), ('الإجمالي الشهري', '💵 ~$6-7/شهر'), ('الإجمالي السنوي', '💵 ~$70-85/سنة')]:
    row = t2.add_row().cells
    row[0].text = k
    row[1].text = v

doc.add_paragraph()

doc.add_heading('المرحلة الثالثة - إذا زادت الزوار', level=2)
t3 = doc.add_table(rows=1, cols=2)
t3.style = 'Light Grid Accent 1'
t3.rows[0].cells[0].text = 'البند'
t3.rows[0].cells[1].text = 'التكلفة'
for k, v in [('Railway Pro', '💵 $20/شهر'), ('الدومين', '💵 ~$10/سنة'), ('الإجمالي', '💵 ~$21/شهر')]:
    row = t3.add_row().cells
    row[0].text = k
    row[1].text = v

doc.add_paragraph()
note = doc.add_paragraph()
note.add_run('ملاحظة: ').bold = True
note.add_run('المشروع شغال فعلاً على Vercel - فقط انتظر التطوير ثم انتقل لRailway بسعر $5/شهر.')

doc.add_page_break()

# ===== SECTION 6: Architecture =====
doc.add_heading('6. هيكل قاعدة البيانات (13 جدول)', level=1)

db_tables = [
    'users - المستخدمين (5 ادوار)',
    'pharmacies - الصيدليات (PostGIS)',
    'drugs - قاعدة الادوية الرئيسية',
    'inventory - المخزون لكل صيدلية',
    'inventory_movements - حركات المخزون',
    'suppliers - الموردين',
    'purchase_invoices - فواتير الشراء',
    'purchase_orders - اوامر الشراء (سوق الموردين)',
    'supplier_products - منتجات الموردين',
    'ratings - تقييمات الموردين',
    'pharmacy_requests - طلبات المواطنين',
    'pharmacy_reviews - تقييمات الصيدليات',
    'notifications - الاشعارات',
    'admin_audit_log - سجل التدقيق',
]
for t in db_tables:
    doc.add_paragraph('📋 ' + t, style='List Bullet')

doc.add_page_break()

# ===== SECTION 7: Pages =====
doc.add_heading('7. صفحات التطبيق', level=1)

doc.add_heading('صفحات الويب (Frontend)', level=2)
pages = [
    ('الرئيسية', '/', 'صفحة الترحيب والبحث'),
    ('تسجيل الدخول', '/login', 'بوابة الدخول'),
    ('التسجيل', '/register', 'انشاء حساب جديد'),
    ('لوحة المواطن', '/dashboard', 'البحث عن الادوية والصيدليات'),
    ('طلبات المواطن', '/dashboard/requests', 'طلبات الادوية المقدمة'),
    ('لوحة المورد', '/supplier', 'لوحة تحكم المورد'),
    ('منتجات المورد', '/supplier/products', 'ادارة منتجاته'),
    ('طلبات المورد', '/supplier/orders', 'الطلبات الواردة'),
    ('سوق الموردين', '/dashboard/marketplace', 'البحث عن الموردين'),
    ('الطلبات', '/dashboard/orders', 'حالة الطلبات'),
    ('التقارير', '/dashboard/reports', 'تقارير المبيعات'),
    ('الاشعارات', '/dashboard/notifications', 'جميع الاشعارات'),
    ('لوحة المشرف', '/admin/users', 'ادارة المستخدمين'),
    ('ادارة الادوية', '/admin/drugs', 'ادارة قاعدة الادوية'),
    ('ادارة الصيدليات', '/admin/pharmacies', 'ادارة الصيدليات'),
]
t_pages = doc.add_table(rows=1, cols=3)
t_pages.style = 'Light Grid Accent 1'
t_pages.rows[0].cells[0].text = 'الصفحة'
t_pages.rows[0].cells[1].text = 'المسار'
t_pages.rows[0].cells[2].text = 'الوصف'
for name, path, desc in pages:
    row = t_pages.add_row().cells
    row[0].text = name
    row[1].text = path
    row[2].text = desc

doc.add_page_break()

# ===== SECTION 8: USPs =====
doc.add_heading('8. ما الذي يجعل هذا المشروع مميزا؟', level=1)

usps = [
    ('منصة متكاملة', 'ليس مجرد موقع - بل نظام إدارة صيدليات كامل مع POS وسوق موردين'),
    ('جغرافيا حقيقية', 'PostGIS يسمح بالبحث عن الادوية والصيدليات القريبة - مثل Google Maps للصيدليات'),
    ('نظام ادوار متقدم', '5 ادوار مختلفة (مواطن، صاحب صيدلية، موظف، مورد، مشرف) كل واحد له صلاحيات مختلفة'),
    ('قاعدة بيانات احترافية', '13 جدول مترابطة مع علاقات Foreign Keys و Unique Constraints و Indexes'),
    ('نظام POS متكامل', 'ربط أنظمة نقاط البيع المحلية بالمخزون الإلكتروني تلقائياً'),
    ('تطبيق موبايل', 'Flutter تطبيق Android كامل يتصل بنفس الـ API'),
    ('سجل تدقيق كامل', 'كل شيء مسجل - منشئ، معدل، وقت - لأغراض المراجعة'),
    ('نظام تقييمات', 'تقييم الموردين والصيدليات بناءً على الطلبات الفعلية'),
    ('جاهز للنشر', 'مشروع شغال فعلاً على Vercel - فقط انتظر التطوير'),
    ('توثيق كامل', 'دليل تشغيل مفصل لجميع المكونات'),
]
for title, desc in usps:
    p = doc.add_paragraph()
    run = p.add_run('✅ ' + title + ': ')
    run.bold = True
    p.add_run(desc)

doc.add_page_break()

# ===== SECTION 9: Summary =====
doc.add_heading('9. ملخص تنفيذي', level=1)

summary_data = [
    ('اسم المشروع', 'MM Drugs (ادوية اليمن)'),
    ('النوع', 'منصة إدارة صيدليات إلكترونية'),
    ('الحالة', 'شغال ومنشر ✅'),
    ('الموقع الحالي', 'https://mm-drugs.vercel.app/'),
    ('المستوى', 'انتاجي جاهز'),
    ('اللغة', 'عربي (واجهة كاملة)'),
    ('المطور', 'za3blawy'),
    ('التكلفة الشهرية (حالياً)', '🆓 مجاني'),
    ('التكلفة الشهرية (المستهدف)', '💵 $5-7'),
    ('عدد الأنظمة الفرعية', '8 أنظمة متكاملة'),
    ('عدد الجداول', '13 جدول'),
    ('عدد الـ API Routes', '25+'),
    ('عدد الصفحات', '15+'),
    ('التاريخ', 'جاهز للإطلاق'),
]

t_summary = doc.add_table(rows=1, cols=2)
t_summary.style = 'Light Grid Accent 1'
t_summary.rows[0].cells[0].text = 'البند'
t_summary.rows[0].cells[1].text = 'التفاصيل'
for k, v in summary_data:
    row = t_summary.add_row().cells
    row[0].text = k
    row[1].text = v

doc.add_page_break()

# ===== SECTION 10: Suggestions =====
doc.add_heading('10. اقتراحات للتطوير المستقبلي', level=1)

suggestions = [
    '🛒 نظام الدفع الإلكتروني (PayPal, Stripe, أو مدفوعات محلية)',
    '📱 اشعارات فورية (Push Notifications) بدل اشعارات الصفحة',
    '📊 لوحة تحكم احصائية متقدمة مع مخططات بيانية (Chart.js)',
    '🌐 نسخة انجليزية - i18n للمنصة وتوسيع السوق',
    '🚚 نظام التوصيل مع تتبع الطلبات على الخريطة',
    '💬 نظام المحادثة بين المواطن والصيدلية',
    '🎯 نظام العروض والخصومات (عروض محدودة + كوبونات)',
    '📱 تطبيق iOS - Flutter يدعم iOS ونشر على App Store',
    '🔐 نظام استرداد كلمة المرور + Email verification',
    '📈 نظام الإحالة (Referral) مع مكافآت للإحالة',
]

for s in suggestions:
    p = doc.add_paragraph()
    p.add_run('💡 ').bold = True
    p.add_run(s)

doc.add_paragraph()
p_final = doc.add_paragraph()
p_final.add_run('هل تحتاج تعديل أو اضافة أي قسم؟').italic = True

# Save
output_path = r'D:\منصر مشاريع\mm-drugs\PROJECT_REPORT.docx'
doc.save(output_path)
print(f'✅ تم انشاء ملف Word بنجاح: {output_path}')
