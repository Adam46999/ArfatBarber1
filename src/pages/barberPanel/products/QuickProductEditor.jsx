import { useEffect, useMemo, useState } from "react";
import { FaTimes, FaImage, FaChevronDown, FaImages, FaCheck } from "react-icons/fa";
import { getLocalProductImages } from "../../../services/productImageService";

const EMPTY_PRODUCT = {
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

export default function QuickProductEditor({
  product,
  open,
  saving,
  onClose,
  onSave,
  onDraftChange,
}) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [language, setLanguage] = useState("ar");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const localImages = useMemo(() => getLocalProductImages(), []);

  const editing = Boolean(product?.id);

  useEffect(() => {
    if (!open) return;

    setForm(
      product
        ? {
            ...EMPTY_PRODUCT,
            ...product,
            name: {
              ...EMPTY_PRODUCT.name,
              ...(product.name || {}),
            },
            description: {
              ...EMPTY_PRODUCT.description,
              ...(product.description || {}),
            },
          }
        : EMPTY_PRODUCT
    );

    setAdvancedOpen(false);
    setLanguage("ar");
  }, [product, open]);

  useEffect(() => {
    if (!open) return;
    onDraftChange?.(form);
  }, [form, open, onDraftChange]);

  useEffect(() => {
    if (!open) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [open]);

  if (!open) return null;

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setLocalized(field, lang, value) {
    setForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }));
  }

  function submit(event) {
    event.preventDefault();

    if (!form.name.ar.trim()) {
      alert("اكتب اسم المنتج.");
      return;
    }

    if (form.price === "" || Number(form.price) < 0) {
      alert("اكتب سعر صحيح.");
      return;
    }

    onSave(form);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={submit}
        dir="rtl"
        className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-[#f6f3ed] shadow-[0_-12px_45px_rgba(0,0,0,0.28)] sm:max-h-[82dvh] sm:max-w-[540px] sm:rounded-[24px]"
      >
        <div className="shrink-0 border-b border-black/5 bg-[#f6f3ed]/95 px-4 pb-3 pt-2 backdrop-blur">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.18em] text-[#a47a2c]">
                PRODUCT
              </p>
              <h2 className="text-xl font-black text-[#171717]">
                {editing ? "تعديل المنتج" : "إضافة منتج"}
              </h2>
              <p className="mt-0.5 text-[10px] font-medium text-black/40">
                التغييرات تظهر مباشرة على الكرت قبل الحفظ.
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/5 text-black/55 active:scale-95"
              aria-label="إغلاق"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-4">
          {/* IMAGE */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-xs font-black text-[#4a4338]">
                صورة المنتج
              </label>

              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => setField("imageUrl", "")}
                  className="text-[10px] font-bold text-red-500"
                >
                  إزالة الصورة
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setImagePickerOpen(true)}
              className="flex min-h-[86px] w-full items-center gap-3 rounded-2xl border border-black/10 bg-white p-2.5 text-start transition active:scale-[0.99]"
            >
              <div className="grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-xl bg-[#efede8]">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaImage className="text-xl text-black/20" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-black text-[#171717]">
                  <FaImages className="text-[#a47a2c]" />
                  اختيار صورة
                </p>

                <p className="mt-1 text-[10px] leading-4 text-black/40">
                  اختار من مكتبة صور المنتجات الجاهزة.
                </p>

                {form.imageUrl && (
                  <p className="mt-1 truncate text-[9px] font-bold text-emerald-700">
                    ✓ تم اختيار صورة
                  </p>
                )}
              </div>
            </button>
          </div>

          {/* LOCAL IMAGE PICKER */}
          {imagePickerOpen && (
            <div
              className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-5"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setImagePickerOpen(false);
                }
              }}
            >
              <div className="max-h-[76dvh] w-full overflow-y-auto rounded-t-[26px] bg-[#f6f3ed] p-4 pb-[calc(18px+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[72dvh] sm:max-w-[520px] sm:rounded-[24px]">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" />

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.15em] text-[#a47a2c]">
                      IMAGE LIBRARY
                    </p>
                    <h3 className="text-lg font-black text-[#171717]">
                      اختار صورة المنتج
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setImagePickerOpen(false)}
                    className="grid h-11 w-11 place-items-center rounded-full bg-black/5 text-black/55 active:scale-95"
                  >
                    <FaTimes />
                  </button>
                </div>

                {localImages.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-white px-4 py-10 text-center">
                    <FaImages className="mx-auto text-3xl text-black/15" />

                    <p className="mt-3 text-sm font-black text-black/55">
                      مكتبة الصور فاضية حاليًا
                    </p>

                    <p className="mx-auto mt-1 max-w-[280px] text-[11px] leading-5 text-black/40">
                      أضف الصور داخل src/assets/products وبعد الـPush رح تظهر هون تلقائيًا.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {localImages.map((image) => {
                      const selected = form.imageUrl === image.url;

                      return (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => {
                            setField("imageUrl", image.url);
                            setImagePickerOpen(false);
                          }}
                          className={`relative overflow-hidden rounded-2xl border bg-white p-1.5 transition active:scale-[0.97] ${
                            selected
                              ? "border-[#c8a24e] ring-2 ring-[#c8a24e]/20"
                              : "border-black/8"
                          }`}
                        >
                          <div className="aspect-square overflow-hidden rounded-xl bg-black/5">
                            <img
                              src={image.url}
                              alt={image.label}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <p className="mt-1.5 truncate px-1 text-[9px] font-bold text-black/55">
                            {image.label}
                          </p>

                          {selected && (
                            <span className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#171817] text-[#e8c779] shadow">
                              <FaCheck size={9} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* CORE FIELDS */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[#4a4338]">
              اسم المنتج
            </span>
            <input
              autoFocus={!editing}
              value={form.name.ar}
              onChange={(event) =>
                setLocalized("name", "ar", event.target.value)
              }
              placeholder="مثال: كريم تصفيف مطفي"
              className="min-h-[50px] w-full rounded-xl border border-black/10 bg-white px-3 text-base font-bold text-[#171717] placeholder:text-black/30 outline-none transition focus:border-[#c8a24e] focus:ring-2 focus:ring-[#c8a24e]/10"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-xs font-black text-[#4a4338]">
                السعر ₪
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setField("price", event.target.value)}
                placeholder="0"
                className="min-h-[50px] w-full rounded-xl border border-black/10 bg-white px-3 text-base font-black text-[#171717] placeholder:text-black/30 outline-none transition focus:border-[#c8a24e] focus:ring-2 focus:ring-[#c8a24e]/10"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-black text-[#4a4338]">
                التصنيف
              </span>
              <select
                value={form.category}
                onChange={(event) => setField("category", event.target.value)}
                className="min-h-[50px] w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold text-[#171717] outline-none transition focus:border-[#c8a24e] focus:ring-2 focus:ring-[#c8a24e]/10"
              >
                {CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[#4a4338]">
              وصف قصير
            </span>
            <textarea
              rows="3"
              value={form.description.ar}
              onChange={(event) =>
                setLocalized("description", "ar", event.target.value)
              }
              placeholder="شو بميز المنتج؟"
              className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm leading-6 text-[#171717] placeholder:text-black/30 outline-none transition focus:border-[#c8a24e] focus:ring-2 focus:ring-[#c8a24e]/10"
            />
          </label>

          {/* QUICK FLAGS */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setField("inStock", !form.inStock)}
              className={`min-h-[50px] rounded-xl border px-3 text-sm font-black transition active:scale-[0.98] ${
                form.inStock
                  ? "border-emerald-700/15 bg-emerald-50 text-emerald-800"
                  : "border-black/10 bg-[#eeeae2] text-[#403a31]"
              }`}
            >
              {form.inStock ? "✓ متوفر" : "نفد من المخزون"}
            </button>

            <button
              type="button"
              onClick={() => setField("featured", !form.featured)}
              className={`min-h-[50px] rounded-xl border px-3 text-sm font-black transition active:scale-[0.98] ${
                form.featured
                  ? "border-[#c49a3a]/45 bg-[#f3dfad] text-[#5f4315] shadow-[inset_0_0_0_1px_rgba(196,154,58,0.08)]"
                  : "border-black/10 bg-[#eeeae2] text-[#403a31]"
              }`}
            >
              {form.featured ? "★ مميز" : "☆ عادي"}
            </button>
          </div>

          {/* ADVANCED */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((value) => !value)}
            className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-black/8 bg-white px-3 text-sm font-black text-black/60"
          >
            <span>تفاصيل إضافية</span>
            <FaChevronDown
              className={`transition ${
                advancedOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {advancedOpen && (
            <div className="space-y-4 rounded-2xl border border-black/5 bg-white p-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-[#5b5245]">
                  الماركة
                </span>
                <input
                  value={form.brand}
                  onChange={(event) => setField("brand", event.target.value)}
                  className="min-h-[46px] w-full rounded-xl border border-black/10 bg-[#fbfaf7] px-3 font-bold text-[#171717] placeholder:text-black/30 outline-none transition focus:border-[#c8a24e] focus:ring-2 focus:ring-[#c8a24e]/10"
                />
              </label>

              <div>
                <p className="mb-2 text-xs font-black text-[#5b5245]">
                  الترجمات
                </p>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  {[
                    ["ar", "العربية"],
                    ["he", "עברית"],
                    ["en", "English"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value)}
                      className={`min-h-[42px] rounded-lg text-xs font-black ${
                        language === value
                          ? "bg-[#171717] text-[#e5c474]"
                          : "bg-black/5 text-black/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {language !== "ar" && (
                  <div className="space-y-3">
                    <input
                      value={form.name[language]}
                      onChange={(event) =>
                        setLocalized("name", language, event.target.value)
                      }
                      placeholder="اسم المنتج"
                      className="min-h-[46px] w-full rounded-xl border border-black/10 bg-[#fbfaf7] px-3 font-bold text-[#171717] placeholder:text-black/30 outline-none transition focus:border-[#c8a24e] focus:ring-2 focus:ring-[#c8a24e]/10"
                    />

                    <textarea
                      rows="2"
                      value={form.description[language]}
                      onChange={(event) =>
                        setLocalized(
                          "description",
                          language,
                          event.target.value
                        )
                      }
                      placeholder="الوصف"
                      className="w-full rounded-xl border border-black/10 bg-[#fbfaf7] p-3 text-[#171717] placeholder:text-black/30 outline-none transition focus:border-[#c8a24e] focus:ring-2 focus:ring-[#c8a24e]/10"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="shrink-0 border-t border-black/5 bg-[#f6f3ed]/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[54px] w-full rounded-2xl bg-[#151616] px-5 text-base font-black text-[#e8c77d] shadow-md transition active:scale-[0.985] disabled:opacity-50"
          >
            {saving
              ? "جاري الحفظ..."
              : editing
                ? "حفظ التعديلات"
                : "إضافة المنتج"}
          </button>
        </div>
      </form>
    </div>
  );
}
