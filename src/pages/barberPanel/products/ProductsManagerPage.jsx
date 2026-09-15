import { useEffect, useState } from "react";

import {
  archiveProduct,
  createProduct,
  getAdminProducts,
  updateProduct,
  seedDemoProducts,
} from "../../../services/productsAdminService";

const EMPTY_FORM = {
  id: "",
  name: { ar: "", he: "", en: "" },
  description: { ar: "", he: "", en: "" },
  brand: "",
  price: "",
  category: "styling",
  imageUrl: "",
  featured: false,
  inStock: true,
  active: true,
  sortOrder: 0,
};

const CATEGORIES = [
  ["hair_care", "عناية بالشعر"],
  ["beard_care", "عناية باللحية"],
  ["styling", "تصفيف"],
  ["tools", "أدوات"],
  ["bundles", "باقات"],
];

export default function ProductsManagerPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const editing = Boolean(form.id);

  async function loadProducts() {
    setLoading(true);

    try {
      const data = await getAdminProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
      setMessage("تعذر تحميل المنتجات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateLocalized(field, lang, value) {
    setForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setMessage("");
  }

  function editProduct(product) {
    setForm({
      id: product.id,
      name: {
        ar: product.name?.ar || "",
        he: product.name?.he || "",
        en: product.name?.en || "",
      },
      description: {
        ar: product.description?.ar || "",
        he: product.description?.he || "",
        en: product.description?.en || "",
      },
      brand: product.brand || "",
      price: product.price ?? "",
      category: product.category || "styling",
      imageUrl: product.imageUrl || "",
      featured: product.featured,
      inStock: product.inStock,
      active: product.active,
      sortOrder: product.sortOrder || 0,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.ar.trim()) {
      setMessage("اسم المنتج بالعربي مطلوب.");
      return;
    }

    if (!form.price || Number(form.price) < 0) {
      setMessage("أدخل سعر صحيح.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (editing) {
        await updateProduct(form.id, form);
        setMessage("تم تعديل المنتج بنجاح.");
      } else {
        await createProduct(form);
        setMessage("تمت إضافة المنتج بنجاح.");
      }

      setForm(EMPTY_FORM);
      await loadProducts();
    } catch (error) {
      console.error(error);
      setMessage("حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDemoSeed() {
    setSaving(true);
    setMessage("");

    try {
      const result = await seedDemoProducts();

      if (result.alreadyExists) {
        setMessage("المنتجات التجريبية موجودة مسبقًا.");
      } else {
        setMessage(`تمت إضافة ${result.added} منتجات تجريبية.`);
      }

      await loadProducts();
    } catch (error) {
      console.error(error);
      setMessage("تعذر إضافة المنتجات التجريبية.");
    } finally {
      setSaving(false);
    }
  }
  async function handleArchive(product) {
    const ok = window.confirm(`إخفاء "${product.name?.ar || "المنتج"}"؟`);
    if (!ok) return;

    try {
      await archiveProduct(product.id);
      await loadProducts();
      setMessage("تم إخفاء المنتج.");
    } catch (error) {
      console.error(error);
      setMessage("تعذر إخفاء المنتج.");
    }
  }

  return (
    <section dir="rtl" className="min-h-screen bg-[#f4f1ea] px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-black text-[#b08b3e]">PRODUCTS</p>
          <h1 className="mt-1 text-2xl font-black text-[#171717]">
            إدارة المنتجات
          </h1>
          <p className="mt-1 text-sm text-black/50">
            أضف المنتجات وعدّل السعر والتوفر وظهورها للزبائن.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">
              {editing ? "تعديل المنتج" : "إضافة منتج"}
            </h2>

            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-bold text-black/50"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {["ar", "he", "en"].map((lang) => (
              <label key={lang} className="block">
                <span className="mb-1 block text-xs font-bold text-black/50">
                  اسم المنتج {lang.toUpperCase()}
                </span>

                <input
                  value={form.name[lang]}
                  onChange={(e) =>
                    updateLocalized("name", lang, e.target.value)
                  }
                  className="min-h-[48px] w-full rounded-xl border border-black/10 px-3 outline-none focus:border-[#d6b15e]"
                />
              </label>
            ))}

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-black/50">
                الماركة
              </span>
              <input
                value={form.brand}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, brand: e.target.value }))
                }
                className="min-h-[48px] w-full rounded-xl border border-black/10 px-3 outline-none focus:border-[#d6b15e]"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold text-black/50">
                السعر ₪
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, price: e.target.value }))
                }
                className="min-h-[48px] w-full rounded-xl border border-black/10 px-3"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold text-black/50">
                التصنيف
              </span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="min-h-[48px] w-full rounded-xl border border-black/10 bg-white px-3"
              >
                {CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold text-black/50">
                ترتيب العرض
              </span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
                className="min-h-[48px] w-full rounded-xl border border-black/10 px-3"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-bold text-black/50">
              رابط صورة المنتج
            </span>
            <input
              value={form.imageUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
              }
              placeholder="https://..."
              className="min-h-[48px] w-full rounded-xl border border-black/10 px-3"
            />
          </label>

          {["ar", "he", "en"].map((lang) => (
            <label key={lang} className="mt-4 block">
              <span className="mb-1 block text-xs font-bold text-black/50">
                الوصف {lang.toUpperCase()}
              </span>

              <textarea
                rows="3"
                value={form.description[lang]}
                onChange={(e) =>
                  updateLocalized("description", lang, e.target.value)
                }
                className="w-full rounded-xl border border-black/10 p-3 outline-none focus:border-[#d6b15e]"
              />
            </label>
          ))}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-black/10 px-3">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    inStock: e.target.checked,
                  }))
                }
              />
              <span className="text-sm font-bold">متوفر</span>
            </label>

            <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-black/10 px-3">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    featured: e.target.checked,
                  }))
                }
              />
              <span className="text-sm font-bold">منتج مميز</span>
            </label>
          </div>

          {message && (
            <p className="mt-4 text-sm font-bold text-[#8a6b2d]">{message}</p>
          )}

          <button
            disabled={saving}
            className="mt-5 min-h-[52px] w-full rounded-2xl bg-[#171717] px-5 font-black text-[#d6b15e] disabled:opacity-50"
          >
            {saving
              ? "جاري الحفظ..."
              : editing
                ? "حفظ التعديلات"
                : "إضافة المنتج"}
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">المنتجات الحالية</h2>

            <button
              type="button"
              disabled={saving}
              onClick={handleDemoSeed}
              className="min-h-[44px] rounded-xl border border-[#b08b3e]/30 bg-white px-3 text-xs font-black text-[#8a6928] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              تحميل منتجات تجريبية
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-black/50">جاري التحميل...</p>
          ) : products.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-black/45">
              لا توجد منتجات حتى الآن.
            </p>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">
                    {product.name?.ar || "بدون اسم"}
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#b08b3e]">
                    ₪{product.price}
                  </p>

                  <p className="mt-1 text-xs text-black/40">
                    {product.inStock ? "متوفر" : "غير متوفر"}
                    {product.featured ? " • مميز" : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => editProduct(product)}
                    className="rounded-lg bg-black/5 px-3 py-2 text-xs font-black"
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    onClick={() => handleArchive(product)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                  >
                    إخفاء
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

