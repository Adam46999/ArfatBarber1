import { useCallback, useEffect, useState } from "react";
import { getPublicProducts } from "../services/productsService";

const DEV_DEMO_PRODUCTS = [
  {
    id: "demo-1",
    name: {
      ar: "كلاي مطفي لتصفيف الشعر",
      he: "חימר מט לעיצוב השיער",
      en: "Arfat Matte Clay",
    },
    description: {
      ar: "ثبات قوي ولمسة مطفية طبيعية بدون لمعان.",
      he: "אחיזה חזקה וגימור מט טבעי.",
      en: "Strong hold with a natural matte finish.",
    },
    brand: "ARFAT",
    price: 60,
    category: "styling",
    imageUrl: "https://placehold.co/900x900/17130f/e8c982?text=MATTE+CLAY",
    featured: true,
    inStock: true,
    active: true,
    sortOrder: 1,
  },
  {
    id: "demo-2",
    name: {
      ar: "زيت لحية أرفات",
      he: "שמן זקן ארפאת",
      en: "Arfat Beard Oil",
    },
    description: {
      ar: "ترطيب يومي للحية ولمسة مرتبة وناعمة.",
      he: "לחות יומית לזקן ומראה מסודר.",
      en: "Daily beard hydration with a clean finish.",
    },
    brand: "ARFAT",
    price: 50,
    category: "beard_care",
    imageUrl: "https://placehold.co/900x900/201913/e8c982?text=BEARD+OIL",
    featured: true,
    inStock: true,
    active: true,
    sortOrder: 2,
  },
  {
    id: "demo-3",
    name: {
      ar: "بوميد للشعر",
      he: "פומייד לשיער",
      en: "Arfat Pomade",
    },
    description: {
      ar: "تحكم مرن ولمعة خفيفة لتصفيف مرتب.",
      he: "שליטה גמישה וברק עדין.",
      en: "Flexible control with a subtle shine.",
    },
    brand: "ARFAT",
    price: 55,
    category: "hair_care",
    imageUrl: "https://placehold.co/900x900/181512/e8c982?text=POMADE",
    featured: true,
    inStock: true,
    active: true,
    sortOrder: 3,
  },
  {
    id: "demo-4",
    name: {
      ar: "سبراي تصفيف الشعر",
      he: "ספריי לעיצוב השיער",
      en: "Hair Styling Spray",
    },
    description: {
      ar: "سبراي خفيف للحجم والتكستشر اليومي.",
      he: "ספריי קליל לנפח וטקסטורה.",
      en: "Light styling spray for texture and volume.",
    },
    brand: "ARFAT",
    price: 45,
    category: "hair_care",
    imageUrl: "https://placehold.co/900x900/111111/e8c982?text=HAIR+SPRAY",
    featured: false,
    inStock: true,
    active: true,
    sortOrder: 4,
  },
  {
    id: "demo-5",
    name: {
      ar: "ماكينة تحديد احترافية",
      he: "מכונת פיניש מקצועית",
      en: "Professional Trimmer",
    },
    description: {
      ar: "تحديد دقيق للحواف واللحية.",
      he: "דיוק לקווים ולזקן.",
      en: "Precision detailing for clean lines.",
    },
    brand: "PRO SERIES",
    price: 349,
    category: "tools",
    imageUrl: "https://placehold.co/900x900/101010/e8c982?text=TRIMMER",
    featured: true,
    inStock: true,
    active: true,
    sortOrder: 5,
  },
  {
    id: "demo-6",
    name: {
      ar: "مشط شعر ولحية",
      he: "מסרק לשיער ולזקן",
      en: "Hair & Beard Comb",
    },
    description: {
      ar: "مشط عملي للاستخدام اليومي.",
      he: "מסרק שימושי לשימוש יומיומי.",
      en: "Daily comb for hair and beard.",
    },
    brand: "ARFAT",
    price: 35,
    category: "tools",
    imageUrl: "https://placehold.co/900x900/211d18/e8c982?text=COMB",
    featured: false,
    inStock: true,
    active: true,
    sortOrder: 6,
  },
  {
    id: "demo-7",
    name: {
      ar: "باقة العناية الكاملة",
      he: "ערכת טיפוח מלאה",
      en: "Complete Grooming Kit",
    },
    description: {
      ar: "باقة عناية وتصفيف متكاملة.",
      he: "ערכת טיפוח ועיצוב מלאה.",
      en: "Complete grooming and styling bundle.",
    },
    brand: "ARFAT SELECT",
    price: 149,
    category: "bundles",
    imageUrl: "https://placehold.co/900x900/17130e/e8c982?text=GROOMING+KIT",
    featured: true,
    inStock: true,
    active: true,
    sortOrder: 7,
  },
  {
    id: "demo-8",
    name: {
      ar: "كريم فايبر تثبيت قوي جدًا",
      he: "קרם פייבר לאחיזה חזקה",
      en: "Extra Strong Fiber Cream",
    },
    description: {
      ar: "منتج غير متوفر حاليًا لفحص حالة نفاد المخزون.",
      he: "אינו במלאי כרגע לצורך בדיקה.",
      en: "Currently unavailable for stock-state testing.",
    },
    brand: "BARBER LAB",
    price: 79,
    category: "styling",
    imageUrl: "https://placehold.co/900x900/191919/e8c982?text=FIBER+CREAM",
    featured: false,
    inStock: false,
    active: true,
    sortOrder: 8,
  },
];

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const data = await getPublicProducts();

      const finalProducts =
        data.length === 0 && import.meta.env.DEV
          ? DEV_DEMO_PRODUCTS
          : data;

      setProducts(finalProducts);
      setStatus("success");
    } catch (err) {
      console.error("Products load failed:", err);

      if (import.meta.env.DEV) {
        setProducts(DEV_DEMO_PRODUCTS);
        setStatus("success");
        return;
      }

      setProducts([]);
      setError(err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    status,
    error,
    reloadProducts: loadProducts,
  };
}
