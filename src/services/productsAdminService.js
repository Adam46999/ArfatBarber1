import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { normalizeProduct, PRODUCT_CATEGORIES } from "./productsService";

function cleanLocalizedText(value = {}) {
  return {
    ar: String(value.ar || "").trim(),
    he: String(value.he || "").trim(),
    en: String(value.en || "").trim(),
  };
}

function sanitizeProductInput(input = {}) {
  const price = Number(input.price);
  const sortOrder = Number(input.sortOrder);

  return {
    name: cleanLocalizedText(input.name),
    description: cleanLocalizedText(input.description),

    brand: String(input.brand || "").trim(),

    price: Number.isFinite(price) && price >= 0 ? price : 0,

    category: PRODUCT_CATEGORIES.includes(input.category)
      ? input.category
      : "styling",

    imageUrl: String(input.imageUrl || "").trim(),

    featured: Boolean(input.featured),
    inStock: input.inStock !== false,
    active: input.active !== false,

    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export async function getAdminProducts() {
  const snapshot = await getDocs(collection(db, "products"));

  return snapshot.docs
    .map(normalizeProduct)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createProduct(input) {
  const payload = sanitizeProductInput(input);

  return addDoc(collection(db, "products"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(productId, input) {
  if (!productId) {
    throw new Error("Missing product id");
  }

  const payload = sanitizeProductInput(input);

  await updateDoc(doc(db, "products", productId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveProduct(productId) {
  if (!productId) {
    throw new Error("Missing product id");
  }

  await updateDoc(doc(db, "products", productId), {
    active: false,
    updatedAt: serverTimestamp(),
  });
}

export async function seedDemoProducts() {
  const productsRef = collection(db, "products");
  const existingSnapshot = await getDocs(productsRef);

  const alreadySeeded = existingSnapshot.docs.some(
    (item) => item.data()?.demoSeedKey === "arfat-products-v1"
  );

  if (alreadySeeded) {
    return { added: 0, alreadyExists: true };
  }

  const demoProducts = [
    {
      name: {
        ar: "كلاي مطفي لتصفيف الشعر",
        he: "חימר מט לעיצוב השיער",
        en: "Matte Styling Clay",
      },
      description: {
        ar: "ثبات قوي ولمسة مطفية طبيعية بدون لمعان. مناسب للتصفيف اليومي.",
        he: "אחיזה חזקה וגימור מט טבעי ללא ברק. מתאים לעיצוב יומיומי.",
        en: "Strong hold with a natural matte finish for everyday styling.",
      },
      brand: "ARFAT SELECT",
      price: 69,
      category: "styling",
      imageUrl: "https://placehold.co/900x900/151515/E2C27C?text=MATTE+CLAY",
      featured: true,
      inStock: true,
      active: true,
      sortOrder: 1,
    },
    {
      name: {
        ar: "زيت لحية بريميوم",
        he: "שמן זקן פרימיום",
        en: "Premium Beard Oil",
      },
      description: {
        ar: "زيت خفيف لترطيب اللحية والبشرة مع لمسة مرتبة وناعمة.",
        he: "שמן קליל לריכוך הזקן והעור עם מראה מסודר ונעים.",
        en: "Lightweight beard oil that softens facial hair and hydrates the skin.",
      },
      brand: "ARFAT SELECT",
      price: 59,
      category: "beard_care",
      imageUrl: "https://placehold.co/900x900/1B1712/E2C27C?text=BEARD+OIL",
      featured: true,
      inStock: true,
      active: true,
      sortOrder: 2,
    },
    {
      name: {
        ar: "سبراي ملح البحر",
        he: "ספריי מלח ים",
        en: "Sea Salt Spray",
      },
      description: {
        ar: "يعطي حجم وتكستشر طبيعي للشعر مع ثبات خفيف ومريح.",
        he: "מעניק נפח וטקסטורה טבעית עם אחיזה קלה ונוחה.",
        en: "Adds natural texture and volume with a lightweight hold.",
      },
      brand: "BARBER LAB",
      price: 65,
      category: "styling",
      imageUrl: "https://placehold.co/900x900/17191A/E2C27C?text=SEA+SALT",
      featured: false,
      inStock: true,
      active: true,
      sortOrder: 3,
    },
    {
      name: {
        ar: "شامبو يومي للشعر",
        he: "שמפו יומי לשיער",
        en: "Daily Hair Shampoo",
      },
      description: {
        ar: "تنظيف يومي لطيف للشعر وفروة الرأس بدون إحساس بالجفاف.",
        he: "ניקוי יומי עדין לשיער ולקרקפת ללא תחושת יובש.",
        en: "Gentle daily cleansing for hair and scalp without excessive dryness.",
      },
      brand: "BARBER LAB",
      price: 55,
      category: "hair_care",
      imageUrl: "https://placehold.co/900x900/181818/E2C27C?text=SHAMPOO",
      featured: false,
      inStock: true,
      active: true,
      sortOrder: 4,
    },
    {
      name: {
        ar: "ماكينة تحديد احترافية",
        he: "מכונת פיניש מקצועית",
        en: "Professional Detail Trimmer",
      },
      description: {
        ar: "ماكينة تحديد دقيقة للحواف واللحية بخفة وتحكم ممتاز.",
        he: "מכונת פיניש מדויקת לקווים ולזקן עם שליטה נוחה.",
        en: "Precision trimmer designed for clean lines, beard detailing and control.",
      },
      brand: "PRO SERIES",
      price: 349,
      category: "tools",
      imageUrl: "https://placehold.co/900x900/101010/E2C27C?text=TRIMMER",
      featured: true,
      inStock: true,
      active: true,
      sortOrder: 5,
    },
    {
      name: {
        ar: "مشط شعر ولحية",
        he: "מסרק לשיער ולזקן",
        en: "Hair & Beard Comb",
      },
      description: {
        ar: "مشط عملي للاستخدام اليومي مناسب للشعر واللحية.",
        he: "מסרק שימושי לשימוש יומיומי בשיער ובזקן.",
        en: "Everyday comb suitable for both hair and beard grooming.",
      },
      brand: "ARFAT",
      price: 35,
      category: "tools",
      imageUrl: "https://placehold.co/900x900/201D19/E2C27C?text=COMB",
      featured: false,
      inStock: true,
      active: true,
      sortOrder: 6,
    },
    {
      name: {
        ar: "باقة العناية الكاملة",
        he: "ערכת טיפוח מלאה",
        en: "Complete Grooming Bundle",
      },
      description: {
        ar: "باقة متكاملة للعناية والتصفيف، مناسبة كهدية أو للاستخدام اليومي.",
        he: "ערכת טיפוח ועיצוב מלאה, מתאימה כמתנה או לשימוש יומיומי.",
        en: "Complete grooming and styling bundle for daily use or gifting.",
      },
      brand: "ARFAT SELECT",
      price: 149,
      category: "bundles",
      imageUrl: "https://placehold.co/900x900/17130E/E2C27C?text=GROOMING+KIT",
      featured: true,
      inStock: true,
      active: true,
      sortOrder: 7,
    },
    {
      name: {
        ar: "كريم فايبر تثبيت قوي جدًا للشعر",
        he: "קרם פייבר לאחיזה חזקה במיוחד",
        en: "Extra Strong Fiber Styling Cream",
      },
      description: {
        ar: "ثبات قوي للشعر مع مرونة بالتصفيف. هذا المنتج غير متوفر حاليًا لاختبار حالة نفاد المخزون.",
        he: "אחיזה חזקה וגמישה. מוצר זה אינו במלאי כרגע לצורך בדיקת תצוגת המלאי.",
        en: "Strong flexible hold. Currently unavailable to test the out-of-stock experience.",
      },
      brand: "BARBER LAB",
      price: 79,
      category: "styling",
      imageUrl: "https://placehold.co/900x900/191919/E2C27C?text=FIBER+CREAM",
      featured: false,
      inStock: false,
      active: true,
      sortOrder: 8,
    },
  ];

  await Promise.all(
    demoProducts.map((product) =>
      addDoc(productsRef, {
        ...product,
        demoSeedKey: "arfat-products-v1",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  return {
    added: demoProducts.length,
    alreadyExists: false,
  };
}

export async function setProductStock(productId, inStock) {
  if (!productId) throw new Error("Missing product id");

  await updateDoc(doc(db, "products", productId), {
    inStock: Boolean(inStock),
    updatedAt: serverTimestamp(),
  });
}

export async function setProductFeatured(productId, featured) {
  if (!productId) throw new Error("Missing product id");

  await updateDoc(doc(db, "products", productId), {
    featured: Boolean(featured),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreProduct(productId) {
  if (!productId) throw new Error("Missing product id");

  await updateDoc(doc(db, "products", productId), {
    active: true,
    updatedAt: serverTimestamp(),
  });
}
