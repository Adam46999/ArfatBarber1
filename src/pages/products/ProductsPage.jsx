// src/pages/products/ProductsPage.jsx
import React, { useEffect, useMemo, useState } from "react";

// نفس فكرة الترجمة البسيطة (Fallback)
const useLanguage = () => ({
  lang: "ar",
  dir: "rtl",
  t: {
    productsPremiumRibbon: "منتجات مميّزة",
    productsHeroTitle1: "منتجات احترافية",
    productsHeroTitle2: "للعناية والتصفيف",
    productsHeroSubtitle:
      "تشكيلة مختارة بعناية من أفضل منتجات العناية بالشعر واللحية والأدوات.",
    featured: "مميّز",
    allProducts: "كل المنتجات",
    hairCare: "عناية بالشعر",
    beardCare: "عناية باللحية",
    styling: "تصفيف",
    tools: "أدوات",
    bundles: "باندلز",
    outOfStock: "غير متوفر",
    buy: "اطلب",
    emptyProducts: "لا توجد منتجات ضمن هذا التصنيف",
    productsCtaTitle: "بدك ترشيحات مناسبة لإلك؟",
    productsCtaSubtitle: "فريقنا بيساعدك تختار الأفضل لنوع شعرك واحتياجك.",
    contactUs: "تواصل معنا",
  },
});

// داتا تجريبية محلية (غيّرها لاحقًا بـ fetch)
const PRODUCTS_SEED = [
  {
    id: "p1",
    name: "Shampoo Pro Clean",
    brand: "ARFAT",
    description: "شامبو لطيف ينظف بعمق ويحافظ على رطوبة الشعر.",
    price: 39.9,
    image_url:
      "https://images.unsplash.com/photo-1585386959984-a41552231656?q=80&w=1200",
    category: "hair_care",
    featured: true,
    in_stock: true,
  },
  {
    id: "p2",
    name: "Beard Oil Classic",
    brand: "ARFAT",
    description: "زيت لحية يمنح نعومة ولمعان مع رائحة خفيفة.",
    price: 49.0,
    image_url:
      "https://images.unsplash.com/photo-1604908176997-43191f2f4a3e?q=80&w=1200",
    category: "beard_care",
    featured: false,
    in_stock: true,
  },
  {
    id: "p3",
    name: "Matte Styling Clay",
    brand: "ARFAT",
    description: "كلاي بتثبيت قوي ولمسة نهائية مطفية.",
    price: 45.0,
    image_url:
      "https://images.unsplash.com/photo-1629196912807-4d6adad13e32?q=80&w=1200",
    category: "styling",
    featured: true,
    in_stock: false,
  },
  {
    id: "p4",
    name: "Wide Comb",
    brand: "ARFAT",
    description: "مشط واسع الأسنان لفك التشابك بدون شد.",
    price: 19.0,
    image_url:
      "https://images.unsplash.com/photo-1598550476439-6847785fcea3?q=80&w=1200",
    category: "tools",
    featured: false,
    in_stock: true,
  },
  {
    id: "p5",
    name: "Beard Care Bundle",
    brand: "ARFAT",
    description: "باقة زيت + مشط + بلسم للحية.",
    price: 99.0,
    image_url:
      "https://images.unsplash.com/photo-1600853155996-c5e4ecc6f5e2?q=80&w=1200",
    category: "bundles",
    featured: true,
    in_stock: true,
  },
  {
    id: "p6",
    name: "Leave-in Conditioner",
    brand: "ARFAT",
    description: "كريم يترك على الشعر لتغذية يومية خفيفة.",
    price: 42.0,
    image_url:
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=1200",
    category: "hair_care",
    featured: false,
    in_stock: true,
  },
];

async function fetchProducts() {
  await new Promise((r) => setTimeout(r, 300));
  return PRODUCTS_SEED;
}
function formatPrice(v, lang = "ar", currency = "USD") {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
    }).format(+v || 0);
  } catch {
    return `$${v ?? 0}`;
  }
}
function buildWhatsAppLink({ name, price, brand }) {
  const text = `مرحبًا، أريد هذا المنتج:\n• الاسم: ${name}\n• الماركة: ${
    brand || "-"
  }\n• السعر: ${price}\n— أرسِلوا لي التفاصيل وطريقة الاستلام.`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function ProductsPage() {
  const { lang, t, dir } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let m = true;
    fetchProducts()
      .then((d) => {
        if (m) {
          setProducts(d);
          setStatus("success");
        }
      })
      .catch(() => m && setStatus("error"));
    return () => {
      m = false;
    };
  }, []);

  const labels = useMemo(
    () => ({
      premiumRibbon: t.productsPremiumRibbon,
      heroTitle1: t.productsHeroTitle1,
      heroTitle2: t.productsHeroTitle2,
      heroSubtitle: t.productsHeroSubtitle,
      featured: t.featured,
      allProducts: t.allProducts,
      hair_care: t.hairCare,
      beard_care: t.beardCare,
      styling: t.styling,
      tools: t.tools,
      bundles: t.bundles,
      outOfStock: t.outOfStock,
      buy: t.buy,
      emptyState: t.emptyProducts,
      ctaTitle: t.productsCtaTitle,
      ctaSubtitle: t.productsCtaSubtitle,
      ctaButton: t.contactUs,
    }),
    [t]
  );

  const categories = [
    { value: "all", label: labels.allProducts },
    { value: "hair_care", label: labels.hair_care },
    { value: "beard_care", label: labels.beard_care },
    { value: "styling", label: labels.styling },
    { value: "tools", label: labels.tools },
    { value: "bundles", label: labels.bundles },
  ];

  const filtered =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);
  const featured = products.filter((p) => p.featured);

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-primary" dir={dir}>
      {/* HERO (بنفس روح BookingSection: خلفية فاتحة ونص ذهبي) */}
      <section className="py-16 px-4 text-center">
        <div className="inline-block mb-6 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full">
          <span className="text-gold text-sm font-semibold tracking-wider">
            {labels.premiumRibbon}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
          <span className="block">{labels.heroTitle1}</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-400">
            {labels.heroTitle2}
          </span>
        </h1>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
          {labels.heroSubtitle}
        </p>
      </section>

      {/* ERROR */}
      {status === "error" && (
        <section className="px-4 pb-10">
          <div className="max-w-4xl mx-auto rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            حصل خطأ أثناء جلب المنتجات. جرّب تحديث الصفحة.
          </div>
        </section>
      )}

      {/* FEATURED (كروت بيضاء بحدود رمادية خفيفة) */}
      {status === "success" && featured.length > 0 && (
        <section className="pb-6 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 rounded-full bg-gold" />
              <h2 className="text-2xl md:text-3xl font-bold">
                {labels.featured}
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.slice(0, 3).map((p) => {
                const price = formatPrice(p.price, lang);
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl overflow-hidden bg-white border border-gray-100 hover:border-gold/60 transition shadow-sm"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-50">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          —
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          {p.brand && (
                            <p className="text-xs text-gold font-semibold tracking-wider mb-1">
                              {p.brand}
                            </p>
                          )}
                          <h3 className="text-lg md:text-xl font-bold line-clamp-2">
                            {p.name}
                          </h3>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gold text-primary font-semibold">
                          {labels.featured}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-extrabold text-gold">
                          {price}
                        </span>
                        {!p.in_stock && (
                          <span className="text-xs px-2 py-1 rounded border border-red-200 text-red-600">
                            {labels.outOfStock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FILTERS */}
      <section className="py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {categories.map((c) => {
              const isActive = selectedCategory === c.value;
              const count =
                c.value === "all"
                  ? products.length
                  : products.filter((p) => p.category === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value)}
                  className={`px-4 py-2 rounded-full border text-sm transition
                    ${
                      isActive
                        ? "bg-gradient-to-r from-gold to-yellow-400 text-primary border-yellow-300 shadow"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  aria-pressed={isActive}
                >
                  {c.label}
                  <span
                    className={`ms-2 text-[10px] px-2 py-0.5 rounded-full
                    ${
                      isActive
                        ? "bg-white/60 text-primary/80"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* GRID */}
          {status === "loading" ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="aspect-square animate-pulse bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100" />
              <p className="text-lg md:text-xl">{labels.emptyState}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((p) => {
                const price = formatPrice(p.price, lang);
                const walink = buildWhatsAppLink({
                  name: p.name,
                  brand: p.brand,
                  price,
                });
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-100 hover:border-gold/60 transition rounded-2xl overflow-hidden h-full flex flex-col shadow-sm"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-50">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          —
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        {p.brand ? (
                          <p className="text-[11px] text-gold font-semibold uppercase tracking-wider">
                            {p.brand}
                          </p>
                        ) : (
                          <span />
                        )}
                        {p.category && (
                          <span className="text-[11px] capitalize px-2 py-0.5 rounded border border-gray-200 text-gray-700 bg-gray-50">
                            {{
                              hair_care: labels.hair_care,
                              beard_care: labels.beard_care,
                              styling: labels.styling,
                              tools: labels.tools,
                              bundles: labels.bundles,
                            }[p.category] || p.category.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base md:text-lg font-bold mb-2 line-clamp-2">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                          {p.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-xl md:text-2xl font-extrabold text-gold">
                          {price}
                        </span>
                        {p.in_stock ? (
                          <button
                            onClick={() => window.open(walink, "_blank")}
                            className="px-3 py-2 rounded-xl font-bold text-sm
                                       bg-gradient-to-r from-gold to-yellow-400 text-primary
                                       hover:shadow-md transition"
                            aria-label={labels.buy}
                          >
                            {labels.buy}
                          </button>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded border border-red-200 text-red-600">
                            {labels.outOfStock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA بنفس روحية زر التأكيد بالـBooking */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center bg-white border border-gray-100 rounded-2xl p-10 shadow-sm">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
            {labels.ctaTitle}
          </h2>
          <p className="text-base md:text-lg text-gray-600 mb-6">
            {labels.ctaSubtitle}
          </p>
          <button
            className="w-full sm:w-auto font-bold px-8 py-3 rounded-xl
                       bg-gradient-to-r from-gold to-yellow-400 text-primary
                       hover:shadow-lg transition"
            onClick={() => {
              const el = document.getElementById("contact");
              if (el)
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            {labels.ctaButton}
          </button>
        </div>
      </section>
    </div>
  );
}
