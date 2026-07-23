require("dotenv").config();
const axios = require("axios");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const PHARMACY_API_KEY =
  process.env.PHARMACY_API_KEY || "pharmacy_api_key_here";
const SYNC_ENDPOINT = `${SERVER_URL}/api/pos/sync`;

// ---------------------------------------------------------------------------
// Mock POS inventory data
// ---------------------------------------------------------------------------
const inventoryItems = [
  {
    barcode: "6281007000155",
    name: "بانادول",
    genericName: "باراسيتامول",
    manufacturer: "GlaxoSmithKline",
    unit: "شريط",
    quantity: 150,
    price: 3.75,
    expiryDate: "2026-12-31",
    batchNumber: "PAN-2026-A",
  },
  {
    barcode: "6281007000255",
    name: "أوغمنتين",
    genericName: "أموكسيسيلين + حمض الكلافولانيك",
    manufacturer: "GlaxoSmithKline",
    unit: "شريط",
    quantity: 80,
    price: 18.5,
    expiryDate: "2026-10-15",
    batchNumber: "AUG-2026-B",
  },
  {
    barcode: "6281007000355",
    name: "فينتولين",
    genericName: "سالبوتامول",
    manufacturer: "GlaxoSmithKline",
    unit: "عبوة",
    quantity: 45,
    price: 12.0,
    expiryDate: "2027-03-01",
    batchNumber: "VEN-2027-A",
  },
  {
    barcode: "6281007000455",
    name: "أموكسيسيلين",
    genericName: "أموكسيسيلين",
    manufacturer: "Saudi Pharmaceutical Industries",
    unit: "شريط",
    quantity: 200,
    price: 5.25,
    expiryDate: "2027-01-20",
    batchNumber: "AMX-2027-A",
  },
];

// ---------------------------------------------------------------------------
// Sync function
// ---------------------------------------------------------------------------
async function syncInventory() {
  console.log("=".repeat(60));
  console.log("  MM Drugs — POS Bridge (أداة الربط)");
  console.log("=".repeat(60));
  console.log(`\n  الخادم    : ${SERVER_URL}`);
  console.log(`  API Key   : ${PHARMACY_API_KEY.slice(0, 8)}...`);
  console.log(`  العناصر   : ${inventoryItems.length}\n`);

  try {
    const response = await axios.post(
      SYNC_ENDPOINT,
      { items: inventoryItems },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": PHARMACY_API_KEY,
        },
        timeout: 30000,
      }
    );

    const { ok, message, pharmacy, summary, results } = response.data;

    if (!ok) {
      console.error("✖ خطأ من الخادم:", message);
      process.exit(1);
    }

    console.log(`  ✓ ${message}`);
    console.log(`  الصيدلية : ${pharmacy.name} (${pharmacy.id})`);
    console.log(`\n  ┌──────────────────────────────────────────────────┐`);
    console.log(`  │  التقرير                                       │`);
    console.log(`  ├──────────────────────────────────────────────────┤`);
    console.log(`  │  الإجمالي  : ${String(summary.total).padStart(5)}                                    │`);
    console.log(`  │  تم الإنشاء: ${String(summary.created).padStart(5)}                                    │`);
    console.log(`  │  تم التحديث: ${String(summary.updated).padStart(5)}                                    │`);
    console.log(`  │  فشل       : ${String(summary.failed).padStart(5)}                                    │`);
    console.log(`  └──────────────────────────────────────────────────┘\n`);

    console.log("  تفاصيل كل عنصر:");
    for (const item of results) {
      const icon =
        item.status === "created"
          ? "＋"
          : item.status === "updated"
            ? "✓"
            : "✖";
      console.log(`    ${icon} ${item.name.padEnd(20)} [${item.status}]`);
      if (item.message) {
        console.log(`       سبب: ${item.message}`);
      }
    }

    console.log("\n  ✓ تمت المزامنة بنجاح.");
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      const msg = data?.error || data?.message || "خطأ غير معروف";
      console.error(`\n  ✖ فشل المزامنة (${status}): ${msg}`);

      if (status === 401) {
        console.error(
          "\n  تحقق من أن مفتاح API (PHARMACY_API_KEY) صحيح وفي جدول pharmacies."
        );
      } else if (status === 422 && data?.details) {
        console.error("  تفاصيل التحقق:");
        for (const d of data.details) {
          console.error(`    - ${d.path}: ${d.message}`);
        }
      }
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        `\n  ✖ لا يمكن الاتصال بالخادم ${SERVER_URL}\n    تأكد من أن خادم Next.js يعمل على هذا الرابط.`
      );
    } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
      console.error("\n  ✖ انتهت مهلة الطلب. تحقق من اتصال الشبكة.");
    } else {
      console.error(`\n  ✖ خطأ غير متوقع: ${error.message}`);
    }

    process.exit(1);
  }
}

syncInventory();
