import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaHome,
  FaShoppingBag,
  FaCalendarAlt,
  FaPhoneAlt,
  FaSearch,
  FaThLarge,
  FaCut,
  FaUser,
  FaSprayCan,
  FaTools,
  FaBoxOpen,
} from "react-icons/fa";

import useProducts from "../../hooks/useProducts";
import { getLocalizedProductText } from "../../services/productsService";
import ProductCard from "../../components/products/ProductCard";
import ProductDetailsModal from "../../components/products/ProductDetailsModal";

const WHATSAPP_NUMBER = "972549896985";

const CATEGORY_ICONS = {
  all: FaThLarge,
  hair_care: FaCut,
  beard_care: FaUser,
  styling: FaSprayCan,
  tools: FaTools,
  bundles: FaBoxOpen,
};

export default function ProductsPage({ barberPreview = false }) {
  const { t, i18n } = useTranslation();

  const lang = ["ar", "he", "en"].includes(i18n.language)
    ? i18n.language
    : "ar";

  const dir = lang === "en" ? "ltr" : "rtl";

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { products: rawProducts, status, reloadProducts } = useProducts({ allowDemoFallback: barberPreview });

  const products = useMemo(
    () =>
      rawProducts.map((product) => ({
        ...product,
        name: getLocalizedProductText(product.name, lang),
        description: getLocalizedProductText(product.description, lang),
      })),
    [rawProducts, lang]
  );

  const categories = [
    { value: "all", label: t("products.all") },
    { value: "hair_care", label: t("products.hair_care") },
    { value: "beard_care", label: t("products.beard_care") },
    { value: "styling", label: t("products.styling") },
    { value: "tools", label: t("products.tools") },
    { value: "bundles", label: t("products.bundles") },
  ];

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatch =
        selectedCategory === "all" ||
        product.category === selectedCategory;

      const searchMatch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });
  }, [products, selectedCategory, searchTerm]);

  const heroProduct =
    products.find((product) => product.featured && product.imageUrl) ||
    products.find((product) => product.imageUrl);

  const productUiLabels = {
    recommended: t("products.recommended"),
    available: t("products.available"),
    outOfStock: t("products.out_of_stock"),
    order: t("products.order"),
    details: t("products.details"),
    price: lang === "he" ? "מחיר" : lang === "en" ? "Price" : "السعر",
    close: lang === "he" ? "סגור" : lang === "en" ? "Close" : "إغلاق",
  };

  function handleOrder(product) {
    if (!product?.inStock) return;

    const message =
      lang === "he"
        ? `שלום, אני מעוניין להזמין:\n${product.name}\nמחיר: ₪${product.price}`
        : lang === "en"
          ? `Hello, I would like to order:\n${product.name}\nPrice: ₪${product.price}`
          : `مرحبًا، بدي أطلب المنتج:\n${product.name}\nالسعر: ₪${product.price}`;

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main
      id="main"
      dir={dir}
      className={`min-h-screen bg-[#0b0c0c] text-white ${barberPreview ? "pb-[92px] pt-0" : "pb-[76px] pt-[var(--app-header-h,64px)] md:pb-0"}`}
    >
      {/* HERO */}
      <section className="relative min-h-[190px] overflow-hidden border-b border-[#d6b15e]/10 sm:min-h-[230px] lg:min-h-[250px]">

        {/* Premium fallback background for demo / text-based images */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(214,177,94,0.24),transparent_34%),linear-gradient(135deg,#20170d_0%,#10100f_48%,#0b0c0c_100%)]" />

        {/* Real product photography only */}
        {heroProduct?.imageUrl &&
          !heroProduct.imageUrl.includes("placehold.co") && (
            <img
              src={heroProduct.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center opacity-85 brightness-110 saturate-[1.08]"
            />
          )}

        {/* Readability without killing the image */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0c]/95 via-black/10 to-transparent" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(232,196,116,0.10),transparent_38%)]" />

        <div className="relative mx-auto flex min-h-[190px] max-w-7xl flex-col items-center justify-end px-4 pb-5 pt-5 text-center sm:min-h-[230px] sm:px-8 sm:pb-7 lg:min-h-[250px]">

          <p className="mb-2 rounded-full border border-[#e2c277]/20 bg-black/20 px-3 py-1 text-[8px] font-black tracking-[0.34em] text-[#f0cd7c] backdrop-blur-sm sm:text-[10px]">
            ARFAT BARBER
          </p>

          <h1 className="max-w-xl font-heading text-[28px] font-black leading-[1.04] tracking-[-0.02em] text-[#f5dda7] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-[42px] lg:text-5xl">
            {t("products.hero_title")}
          </h1>

          <div className="mt-2 h-[2px] w-9 rounded-full bg-gradient-to-r from-transparent via-[#e3bf6e] to-transparent sm:w-12" />

          <p className="mt-2 max-w-[320px] text-[11px] font-medium leading-[1.55] text-white/90 sm:max-w-lg sm:text-sm sm:leading-6">
            {t("products.hero_subtitle")}
          </p>
        </div>
      </section>
      {/* CATEGORIES */}
      <section className="relative border-b border-[#d6b15e]/10 bg-[#101110] px-3 py-3 sm:py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b15e]/30 to-transparent" />

        <div className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.value];
            const active = selectedCategory === category.value;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setSelectedCategory(category.value)}
                className={`flex min-h-[62px] min-w-[66px] snap-start shrink-0 flex-col items-center justify-center gap-1.5 rounded-[13px] border px-2.5 py-2 text-[10px] font-bold transition active:scale-[0.97] sm:min-h-[68px] sm:min-w-[82px] sm:px-3 sm:text-[11px] ${
                  active
                    ? "border-[#efd38f] bg-gradient-to-b from-[#f2dca8] to-[#d7b35e] text-[#15120d] shadow-[0_4px_18px_rgba(214,177,94,0.18)]"
                    : "border-[#d6b15e]/15 bg-[#191a18] text-white/85 hover:border-[#d6b15e]/30 hover:bg-[#1d1e1b]"
                }`}
              >
                <Icon
                  className={`text-[17px] ${
                    active ? "text-[#17130d]" : "text-[#dfbd72]"
                  }`}
                />
                <span>{category.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSearchOpen((value) => !value)}
            className={`flex min-h-[62px] min-w-[58px] snap-start shrink-0 items-center justify-center rounded-[13px] border transition active:scale-[0.97] sm:min-h-[68px] ${
              searchOpen
                ? "border-[#efd38f] bg-[#efd38f] text-[#15120d]"
                : "border-[#d6b15e]/15 bg-[#191a18] text-[#dfbd72]"
            }`}
            aria-label={t("products.search")}
          >
            <FaSearch />
          </button>
        </div>

        {searchOpen && (
          <div className="mx-auto mt-3 max-w-7xl">
            <div className="relative">
              <FaSearch className="absolute start-4 top-1/2 -translate-y-1/2 text-[#dfbd72]/65" />

              <input
                autoFocus
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("products.search")}
                className="min-h-[48px] w-full rounded-[14px] border border-[#d6b15e]/15 bg-[#1a1b19] px-11 text-sm text-white shadow-inner outline-none placeholder:text-white/35 focus:border-[#d6b15e]/60 focus:bg-[#1d1e1b]"
              />
            </div>
          </div>
        )}
      </section>
      {/* PRODUCTS */}
      <section className="min-h-[420px] rounded-t-[22px] bg-[#f4f2ee] px-2.5 pb-5 pt-4 text-[#111] sm:rounded-t-[28px] sm:px-5 sm:pb-8 sm:pt-6">
        <div className="mx-auto max-w-7xl">
          {status === "loading" && (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[13px] bg-white"
                >
                  <div className="aspect-[1.12/1] animate-pulse bg-black/10" />
                  <div className="space-y-2 p-3">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-black/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-black/10" />
                    <div className="h-7 w-full animate-pulse rounded bg-black/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="py-20 text-center">
              <p className="font-bold text-red-600">
                {t("products.load_error")}
              </p>

              <button
                type="button"
                onClick={reloadProducts}
                className="mt-4 rounded-xl bg-[#111] px-5 py-3 text-sm font-black text-[#dfc181]"
              >
                {t("products.retry")}
              </button>
            </div>
          )}

          {status === "success" && filteredProducts.length === 0 && (
            <div className="py-20 text-center">
              <FaBoxOpen className="mx-auto text-4xl text-black/20" />
              <p className="mt-4 font-bold text-black/45">
                {t("products.empty")}
              </p>
            </div>
          )}

          {status === "success" && filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  labels={productUiLabels}
                  onDetails={setSelectedProduct}
                  onOrder={handleOrder}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MOBILE BOTTOM NAV */}
      {!barberPreview && (
<nav className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-4 border-t border-white/10 bg-[#0a0b0b]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <Link
          to="/"
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-white/55"
        >
          <FaHome size={16} />
          <span>{t("home")}</span>
        </Link>

        <Link
          to="/products"
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-black text-[#dfc181]"
        >
          <FaShoppingBag size={17} />
          <span>{t("products.title")}</span>
        </Link>

        <Link
          to="/?scrollTo=booking"
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-white/55"
        >
          <FaCalendarAlt size={16} />
          <span>{t("book_now")}</span>
        </Link>

        <Link
          to="/contact"
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-white/55"
        >
          <FaPhoneAlt size={15} />
          <span>{t("contact")}</span>
        </Link>
      </nav>
      )}
      <ProductDetailsModal
        product={selectedProduct}
        labels={productUiLabels}
        onClose={() => setSelectedProduct(null)}
        onOrder={handleOrder}
      />
    </main>
  );
}










