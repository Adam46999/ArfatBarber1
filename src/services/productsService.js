// src/services/productsService.js

import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

export const PRODUCT_CATEGORIES = [
  "hair_care",
  "beard_care",
  "styling",
  "tools",
  "bundles",
];

export const EMPTY_LOCALIZED_TEXT = {
  ar: "",
  he: "",
  en: "",
};

export function getLocalizedProductText(value, language = "ar") {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value !== "object") {
    return "";
  }

  const lang = ["ar", "he", "en"].includes(language) ? language : "ar";

  return (
    value[lang]?.trim?.() ||
    value.ar?.trim?.() ||
    value.he?.trim?.() ||
    value.en?.trim?.() ||
    ""
  );
}

export function normalizeProduct(snapshot) {
  const data =
    typeof snapshot?.data === "function" ? snapshot.data() : snapshot || {};

  const id = snapshot?.id || data.id || "";

  const price = Number(data.price);
  const sortOrder = Number(data.sortOrder);

  return {
    id,

    name: {
      ar: data.name?.ar || "",
      he: data.name?.he || "",
      en: data.name?.en || "",
    },

    description: {
      ar: data.description?.ar || "",
      he: data.description?.he || "",
      en: data.description?.en || "",
    },

    brand: String(data.brand || "").trim(),

    price: Number.isFinite(price) && price >= 0 ? price : 0,

    category: PRODUCT_CATEGORIES.includes(data.category)
      ? data.category
      : "styling",

    imageUrl: String(data.imageUrl || data.image_url || "").trim(),

    featured: Boolean(data.featured),
    inStock: data.inStock !== false && data.in_stock !== false,
    active: data.active !== false,

    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,

    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export async function getPublicProducts() {
  const productsRef = collection(db, "products");

  let snapshot;

  try {
    snapshot = await getDocs(query(productsRef, orderBy("sortOrder", "asc")));
  } catch {
    // Fallback حتى تظل الصفحة تعمل لو المنتجات القديمة لا تحتوي sortOrder.
    snapshot = await getDocs(productsRef);
  }

  return snapshot.docs
    .map(normalizeProduct)
    .filter((product) => product.active)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.id.localeCompare(b.id);
    });
}
