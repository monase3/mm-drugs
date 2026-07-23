"use client";

import { useCallback, useMemo, useEffect, useState } from "react";

interface Supplier {
  id: string;
  fullName: string;
  city: string;
  products: {
    id: string;
    drugName: string;
    genericName: string | null;
    category: string | null;
    price: string;
    minQuantity: number;
  }[];
  avgRating: number | null;
  totalRatings: number;
}

interface SupplierDetail {
  supplier: { id: string; fullName: string; city: string; email: string; phone: string };
  products: { id: string; drugName: string; genericName: string | null; category: string | null; price: string; minQuantity: number; available: boolean }[];
  ratings: { score: number; comment: string | null; fromUserName: string; createdAt: string }[];
  avgRating: number | null;
  totalRatings: number;
  completedOrders: number;
}

interface CartItem {
  productId: string;
  drugName: string;
  supplierName: string;
  unitPrice: number;
  quantity: number;
}

export default function MarketplacePage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ratingModal, setRatingModal] = useState<{ orderId: string; supplierId: string } | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("name");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    fetch("/api/marketplace/suppliers")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setSuppliers(data.suppliers);
        setLoading(false);
      });
  }, []);

  const openSupplierDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedSupplier(null);
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      const data = await res.json();
      if (data.ok) setSelectedSupplier(data);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function addToCart(product: Supplier["products"][0], supplierName: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        productId: product.id,
        drugName: product.drugName,
        supplierName,
        unitPrice: Number(product.price),
        quantity: 1,
      }];
    });
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty < 1) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
    } else {
      setCart((prev) => prev.map((c) => c.productId === productId ? { ...c, quantity: qty } : c));
    }
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  async function placeOrder() {
    if (cart.length === 0) return;
    setOrderLoading(true);

    const grouped = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
      const supplier = suppliers.find((s) => s.products.some((p) => p.id === item.productId));
      if (supplier) {
        if (!acc[supplier.id]) acc[supplier.id] = [];
        acc[supplier.id].push(item);
      }
      return acc;
    }, {});

    for (const [supplierId, items] of Object.entries(grouped)) {
      const totalAmount = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      await fetch("/api/marketplace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: items.map((i) => ({
            supplierProductId: i.productId,
            drugName: i.drugName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          totalAmount,
          notes: orderNotes || undefined,
        }),
      });
    }

    setCart([]);
    setShowCart(false);
    setOrderNotes("");
    setOrderSuccess(true);
    setTimeout(() => setOrderSuccess(false), 4000);
  }

  async function submitRating() {
    if (!ratingModal) return;
    setRatingSaving(true);
    const res = await fetch("/api/supplier-ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: ratingModal.orderId, score: ratingScore, comment: ratingComment || undefined }),
    });
    const data = await res.json();
    setRatingSaving(false);
    if (data.ok) {
      setRatingSuccess(true);
      if (selectedSupplier && selectedSupplier.supplier.id === ratingModal.supplierId) {
        openSupplierDetail(ratingModal.supplierId);
      }
      setRatingModal(null);
      setTimeout(() => setRatingSuccess(false), 3000);
    }
  }

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    suppliers.forEach((s) => s.products.forEach((p) => { if (p.category) cats.add(p.category); }));
    return Array.from(cats).sort();
  }, [suppliers]);

  const filtered = useMemo(() => {
    const minP = minPrice ? Number(minPrice) : 0;
    const maxP = maxPrice ? Number(maxPrice) : Infinity;

    let list = suppliers
      .map((s) => ({
        ...s,
        products: s.products.filter((p) => {
          const price = Number(p.price);
          if (categoryFilter && p.category !== categoryFilter) return false;
          if (price < minP || price > maxP) return false;
          return true;
        }),
      }))
      .filter((s) => {
        if (minRating > 0 && (!s.avgRating || s.avgRating < minRating)) return false;
        const matchesSearch = s.fullName.includes(search) || s.products.some(
          (p) => p.drugName.includes(search) || (p.genericName && p.genericName.includes(search))
        );
        if (search && !matchesSearch) return false;
        return s.products.length > 0;
      });

    switch (sortBy) {
      case "price_asc":
        list.sort((a, b) => Math.min(...a.products.map((p) => Number(p.price))) - Math.min(...b.products.map((p) => Number(p.price))));
        break;
      case "price_desc":
        list.sort((a, b) => Math.max(...b.products.map((p) => Number(p.price))) - Math.max(...a.products.map((p) => Number(p.price))));
        break;
      case "rating":
        list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
        break;
      default:
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    return list;
  }, [suppliers, search, categoryFilter, minPrice, maxPrice, minRating, sortBy]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">سوق الأدوية</h1>
          <p className="mt-1 text-sm text-slate-500">قارن الأسعار واطلب من الموردين مباشرة</p>
        </div>
        <button
          onClick={() => setShowCart((v) => !v)}
          className="relative rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
        >
          سلة الطلبات ({cart.length})
          {cart.length > 0 && (
            <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {orderSuccess && (
        <div className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          تم إرسال الطلبات بنجاح! يمكنك متابعتها من صفحة الطلبات.
        </div>
      )}

      {ratingSuccess && (
        <div className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          تم إرسال التقييم بنجاح! شكراً لك.
        </div>
      )}

      {showCart && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">سلة الطلبات</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400">السلة فارغة</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">الدواء</th>
                      <th className="px-4 py-2 font-semibold">المورد</th>
                      <th className="px-4 py-2 font-semibold">السعر</th>
                      <th className="px-4 py-2 font-semibold">الكمية</th>
                      <th className="px-4 py-2 font-semibold">المجموع</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.productId} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-semibold text-slate-800">{item.drugName}</td>
                        <td className="px-4 py-2 text-slate-500">{item.supplierName}</td>
                        <td className="px-4 py-2 text-slate-600">{item.unitPrice.toLocaleString("ar-YE")} ﷼</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateCartQty(item.productId, item.quantity - 1)} className="h-6 w-6 rounded bg-slate-100 text-sm font-bold hover:bg-slate-200">-</button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.productId, item.quantity + 1)} className="h-6 w-6 rounded bg-slate-100 text-sm font-bold hover:bg-slate-200">+</button>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-800">
                          {(item.unitPrice * item.quantity).toLocaleString("ar-YE")} ﷼
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => removeFromCart(item.productId)} className="text-xs font-bold text-rose-600 hover:underline">حذف</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-semibold text-slate-700">ملاحظات</label>
                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm" placeholder="ملاحظات على الطلب..." />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xl font-extrabold text-slate-900">الإجمالي: {cartTotal.toLocaleString("ar-YE")} ﷼</p>
                <button onClick={placeOrder} disabled={orderLoading} className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                  {orderLoading ? "جارٍ الإرسال..." : "تأكيد الطلب"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن دواء..."
          className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">السعر:</label>
          <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="من" type="number" min={0} step="0.01" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
          <span className="text-slate-300">-</span>
          <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="إلى" type="number" min={0} step="0.01" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white">
          <option value="">كل التصنيفات</option>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white">
          <option value="name">الترتيب: الاسم</option>
          <option value="price_asc">السعر: الأقل أولاً</option>
          <option value="price_desc">السعر: الأعلى أولاً</option>
          <option value="rating">التقييم: الأعلى أولاً</option>
        </select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">التقييم:</span>
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <button key={r} onClick={() => setMinRating(r)} className={`rounded px-2 py-1 text-xs font-bold ${minRating === r ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {r === 0 ? "الكل" : `${r}★`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">جارٍ التحميل...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg text-slate-400">لا توجد نتائج</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((supplier) => (
            <div key={supplier.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <button onClick={() => openSupplierDetail(supplier.id)} className="text-right">
                    <h3 className="text-lg font-bold text-slate-900 hover:text-teal-700">{supplier.fullName}</h3>
                    <p className="text-sm text-slate-500">{supplier.city}</p>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {supplier.avgRating ? (
                    <>
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-bold text-slate-700">{supplier.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({supplier.totalRatings})</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">لا توجد تقييمات</span>
                  )}
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">الدواء</th>
                      <th className="px-4 py-2 font-semibold">السعر</th>
                      <th className="px-4 py-2 font-semibold">الحد الأدنى</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplier.products.map((product) => (
                      <tr key={product.id} className="border-t border-slate-100">
                        <td className="px-4 py-2">
                          <p className="font-semibold text-slate-800">{product.drugName}</p>
                          <p className="text-xs text-slate-400">{[product.genericName, product.category].filter(Boolean).join(" • ") || ""}</p>
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-800">{Number(product.price).toLocaleString("ar-YE")} ﷼</td>
                        <td className="px-4 py-2 text-slate-500">{product.minQuantity}</td>
                        <td className="px-4 py-2">
                          <button onClick={() => addToCart(product, supplier.fullName)} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700">
                            + إضافة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedSupplier(null)}>
          <div className="mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{selectedSupplier.supplier.fullName}</h2>
                <p className="text-sm text-slate-500">{selectedSupplier.supplier.city}</p>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="rounded-lg px-3 py-1 text-sm text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500">
              {selectedSupplier.avgRating && (
                <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">
                  ★ {selectedSupplier.avgRating.toFixed(1)} ({selectedSupplier.totalRatings})
                </span>
              )}
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                {selectedSupplier.completedOrders} طلب مكتمل
              </span>
              {selectedSupplier.supplier.phone && (
                <span className="rounded-full bg-slate-100 px-3 py-1">📞 {selectedSupplier.supplier.phone}</span>
              )}
            </div>

            <h3 className="mb-3 text-base font-bold text-slate-800">المنتجات</h3>
            <div className="mb-6 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">الدواء</th>
                    <th className="px-4 py-2 font-semibold">السعر</th>
                    <th className="px-4 py-2 font-semibold">الحد الأدنى</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSupplier.products.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">
                          <p className="font-semibold text-slate-800">{p.drugName}</p>
                          <p className="text-xs text-slate-400">{[p.genericName, p.category].filter(Boolean).join(" • ") || ""}</p>
                        </td>
                      <td className="px-4 py-2 font-bold text-slate-800">{Number(p.price).toLocaleString("ar-YE")} ﷼</td>
                      <td className="px-4 py-2 text-slate-500">{p.minQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-3 text-base font-bold text-slate-800">التقييمات</h3>
            {selectedSupplier.ratings.length === 0 ? (
              <p className="mb-6 text-sm text-slate-400">لا توجد تقييمات بعد</p>
            ) : (
              <div className="mb-6 space-y-3">
                {selectedSupplier.ratings.map((r, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{r.fromUserName}</span>
                      <span className="text-yellow-500 text-sm">{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</span>
                    </div>
                    {r.comment && <p className="text-xs text-slate-500">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setSelectedSupplier(null)} className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRatingModal(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">تقييم المورد</h2>
            <div className="mb-4 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRatingScore(s)} className={`text-3xl ${s <= ratingScore ? "text-yellow-500" : "text-slate-200"} hover:text-yellow-400`}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
              placeholder="أضف تعليقاً (اختياري)..."
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setRatingModal(null)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">
                إلغاء
              </button>
              <button onClick={submitRating} disabled={ratingSaving} className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {ratingSaving ? "جارٍ الإرسال..." : "إرسال التقييم"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
