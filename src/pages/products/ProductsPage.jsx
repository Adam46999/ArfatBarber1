import { useEffect, useMemo, useState } from "react";
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
import {
  archiveProduct,
  createProduct,
  getAdminProducts,
  restoreProduct,
  setProductFeatured,
  setProductStock,
  updateProduct,
} from "../../services/productsAdminService";
import QuickProductEditor from "../barberPanel/products/QuickProductEditor";

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
  const [adminEditorOpen, setAdminEditorOpen] = useState(false);
  const [adminEditingProduct, setAdminEditingProduct] = useState(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminBusyId, setAdminBusyId] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminDraft, setAdminDraft] = useState(null);
  const [adminHiddenOpen, setAdminHiddenOpen] = useState(false);
  const [adminHiddenProducts, setAdminHiddenProducts] = useState([]);
  const [adminHiddenLoading, setAdminHiddenLoading] = useState(false);

  const { products: rawProducts, status, reloadProducts } = useProducts({ allowDemoFallback: barberPreview });

  const products = useMemo(() => {
    const localizedProducts = rawProducts.map((product) => ({
      ...product,
      _source: product,
      name: getLocalizedProductText(product.name, lang),
      description: getLocalizedProductText(product.description, lang),
    }));

    if (
      !barberPreview ||
      !adminEditorOpen ||
      !adminDraft
    ) {
      return localizedProducts;
    }

    const draftName =
      getLocalizedProductText(adminDraft.name, lang) ||
      (lang === "he"
        ? "מוצר חדש"
        : lang === "en"
          ? "New Product"
          : "منتج جديد");

    const draftDescription =
      getLocalizedProductText(adminDraft.description, lang) || "";

    const previewDraft = {
      ...adminDraft,
      name: draftName,
      description: draftDescription,
      imageUrl: adminDraft.imageUrl || "",
      brand: adminDraft.brand || "",
      price: Number(adminDraft.price || 0),
      category: adminDraft.category || "styling",
      inStock: adminDraft.inStock !== false,
      featured: Boolean(adminDraft.featured),
      active: true,
    };

    if (adminEditingProduct?.id) {
      return localizedProducts.map((product) =>
        product.id === adminEditingProduct.id
          ? {
              ...product,
              ...previewDraft,
              id: product.id,
              _source: product._source,
              __draft: true,
            }
          : product
      );
    }

    return [
      {
        id: "__admin_new_draft__",
        ...previewDraft,
        _source: adminDraft,
        sortOrder: -1,
        __draft: true,
      },
      ...localizedProducts,
    ];
  }, [
    rawProducts,
    lang,
    barberPreview,
    adminEditorOpen,
    adminDraft,
    adminEditingProduct,
  ]);
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
      if (product.__draft) return true;
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


  // LOAD HIDDEN PRODUCTS
  useEffect(() => {
    if (!barberPreview) return;

    let mounted = true;

    async function loadHidden() {
      setAdminHiddenLoading(true);

      try {
        const allProducts = await getAdminProducts();

        if (mounted) {
          setAdminHiddenProducts(
            allProducts.filter((product) => product.active === false)
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) {
          setAdminHiddenLoading(false);
        }
      }
    }

    loadHidden();

    return () => {
      mounted = false;
    };
  }, [barberPreview]);

  async function handleAdminRestore(product) {
    setAdminBusyId(product.id);
    setAdminMessage("");

    try {
      await restoreProduct(product.id);

      setAdminHiddenProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      setAdminMessage("تمت إعادة المنتج للصفحة.");
      await reloadProducts();
    } catch (error) {
      console.error(error);
      setAdminMessage("تعذر إعادة المنتج.");
    } finally {
      setAdminBusyId("");
    }
  }
  function openAdminAdd() {
    setAdminDraft(null);
    setAdminEditingProduct(null);
    setAdminMessage("");
    setAdminEditorOpen(true);
  }

  function openAdminEdit(product) {
    setAdminDraft(null);
    setAdminEditingProduct(product?._source || product);
    setAdminMessage("");
    setAdminEditorOpen(true);
  }

  async function handleAdminSave(form) {
    setAdminSaving(true);
    setAdminMessage("");

    try {
      if (adminEditingProduct?.id) {
        await updateProduct(adminEditingProduct.id, form);
        setAdminMessage("تم حفظ التعديلات.");
      } else {
        await createProduct(form);
        setAdminMessage("تمت إضافة المنتج.");
      }

      setAdminEditorOpen(false);
      setAdminEditingProduct(null);
      setAdminDraft(null);
      await reloadProducts();
    } catch (error) {
      console.error(error);
      setAdminMessage("تعذر حفظ المنتج.");
    } finally {
      setAdminSaving(false);
    }
  }

  async function handleAdminStock(product) {
    setAdminBusyId(product.id);

    try {
      await setProductStock(product.id, !product.inStock);
      await reloadProducts();
    } catch (error) {
      console.error(error);
      setAdminMessage("تعذر تغيير حالة المخزون.");
    } finally {
      setAdminBusyId("");
    }
  }

  async function handleAdminFeatured(product) {
    setAdminBusyId(product.id);

    try {
      await setProductFeatured(product.id, !product.featured);
      await reloadProducts();
    } catch (error) {
      console.error(error);
      setAdminMessage("تعذر تغيير المنتج المميز.");
    } finally {
      setAdminBusyId("");
    }
  }

  async function handleAdminArchive(product) {
    const approved = window.confirm(
      `إخفاء "${product.name}" من صفحة المنتجات؟`
    );

    if (!approved) return;

    setAdminBusyId(product.id);

    try {
      await archiveProduct(product.id);

      setAdminHiddenProducts((current) => {
        const source = {
          ...(product._source || product),
          active: false,
        };

        return [
          source,
          ...current.filter((item) => item.id !== product.id),
        ];
      });

      setAdminMessage("تم إخفاء المنتج. موجود بقسم المخفية.");
      await reloadProducts();
    } catch (error) {
      console.error(error);
      setAdminMessage("تعذر إخفاء المنتج.");
    } finally {
      setAdminBusyId("");
    }
  }
  return (
    <main
      id="main"
      dir={dir}
      className={`min-h-screen bg-[#0b0c0c] text-white ${barberPreview ? "pb-[92px] pt-[var(--app-header-h,64px)]" : "pb-[76px] pt-[var(--app-header-h,64px)] md:pb-0"}`}
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
      {/* BARBER ADMIN BAR */}
      {barberPreview && (
        <section className="sticky top-[var(--app-header-h,64px)] z-30 border-y border-[#d6b15e]/15 bg-[#f5f1e8]/95 px-3 py-2 text-[#171717] shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black tracking-[0.14em] text-[#9d7428]">
                وضع الإدارة
              </p>
              <p className="truncate text-xs font-bold text-black/50">
                عدّل المنتجات وشوف النتيجة بنفس الصفحة
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setAdminHiddenOpen(true)}
                className="relative flex min-h-[46px] items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-[11px] font-black text-black/60 shadow-sm transition active:scale-[0.97]"
              >
                المخفية

                {adminHiddenProducts.length > 0 && (
                  <span className="mr-1.5 rounded-full bg-[#171817] px-1.5 py-0.5 text-[9px] text-[#e8c779]">
                    {adminHiddenProducts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={openAdminAdd}
                className="flex min-h-[46px] items-center justify-center rounded-xl bg-[#171817] px-3 text-[11px] font-black text-[#e8c779] shadow transition active:scale-[0.97] sm:px-4 sm:text-xs"
              >
                + إضافة
              </button>
            </div>
          </div>

          {adminMessage && (
            <div className="mx-auto mt-2 max-w-7xl rounded-lg bg-[#fff7e5] px-3 py-2 text-[10px] font-bold text-[#76551d]">
              {adminMessage}
            </div>
          )}
        </section>
      )}
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
                  adminMode={barberPreview}
                  adminBusy={adminBusyId === product.id || product.__draft}
                  onAdminEdit={() => openAdminEdit(product)}
                  onAdminToggleStock={() => handleAdminStock(product)}
                  onAdminToggleFeatured={() => handleAdminFeatured(product)}
                  onAdminArchive={() => handleAdminArchive(product)}
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
      {/* HIDDEN PRODUCTS SHEET */}
      {barberPreview && adminHiddenOpen && (
        <div
          className="fixed inset-0 z-[125] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAdminHiddenOpen(false);
            }
          }}
        >
          <section
            dir="rtl"
            className="flex max-h-[72dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-[#f6f3ed] shadow-[0_-12px_45px_rgba(0,0,0,0.28)] sm:max-h-[70dvh] sm:max-w-[520px] sm:rounded-[24px]"
          >
            <div className="shrink-0 border-b border-black/5 px-4 pb-3 pt-2">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black tracking-[0.15em] text-[#a47a2c]">
                    HIDDEN
                  </p>
                  <h2 className="text-lg font-black text-[#171717]">
                    المنتجات المخفية
                  </h2>
                  <p className="mt-0.5 text-[10px] text-black/40">
                    رجّع أي منتج للصفحة بضغطة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAdminHiddenOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/5 text-xl text-black/50 active:scale-95"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
              {adminHiddenLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex min-h-[82px] animate-pulse gap-3 rounded-2xl bg-white p-2.5"
                  >
                    <div className="h-16 w-16 rounded-xl bg-black/8" />
                    <div className="flex-1 space-y-2 py-2">
                      <div className="h-3 w-1/2 rounded bg-black/8" />
                      <div className="h-3 w-1/3 rounded bg-black/8" />
                    </div>
                  </div>
                ))
              ) : adminHiddenProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-black text-black/50">
                    ما في منتجات مخفية
                  </p>
                  <p className="mt-1 text-[10px] text-black/35">
                    أي منتج بتخفيه رح يظهر هون.
                  </p>
                </div>
              ) : (
                adminHiddenProducts.map((product) => (
                  <article
                    key={product.id}
                    className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-2.5 shadow-sm"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs text-black/20">
                          صورة
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#171717]">
                        {getLocalizedProductText(product.name, lang) || "بدون اسم"}
                      </p>

                      <p className="mt-1 text-sm font-black text-[#8c6927]">
                        ₪{Number(product.price || 0)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={adminBusyId === product.id}
                      onClick={() => handleAdminRestore(product)}
                      className="min-h-[44px] shrink-0 rounded-xl bg-[#171817] px-3 text-[11px] font-black text-[#e8c779] transition active:scale-[0.97] disabled:opacity-50"
                    >
                      إعادة
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
      {barberPreview && (
        <QuickProductEditor
          product={adminEditingProduct}
          open={adminEditorOpen}
          saving={adminSaving}
          onClose={() => {
            if (!adminSaving) {
              setAdminEditorOpen(false);
              setAdminEditingProduct(null);
              setAdminDraft(null);
            }
          }}
          onSave={handleAdminSave}
          onDraftChange={setAdminDraft}
        />
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
