const LOCAL_PRODUCT_IMAGE_MODULES = import.meta.glob(
  "../assets/products/*.{png,jpg,jpeg,webp,avif}",
  {
    eager: true,
    import: "default",
  }
);

function filenameToLabel(path) {
  const filename = path.split("/").pop() || "";
  const withoutExtension = filename.replace(/\.[^.]+$/, "");

  return withoutExtension
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const PRODUCT_IMAGE_MODE = "local-library";

export function getLocalProductImages() {
  return Object.entries(LOCAL_PRODUCT_IMAGE_MODULES)
    .map(([path, url]) => ({
      id: path,
      path,
      url,
      label: filenameToLabel(path),
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
}

export function normalizeProductImageUrl(value) {
  return String(value || "").trim();
}

export function getProductImagePreview(value) {
  return normalizeProductImageUrl(value);
}

/*
 * CURRENT:
 * User chooses a local image from src/assets/products.
 * Firestore stores the generated deployed image URL.
 *
 * FUTURE:
 * This same function can upload a File to Firebase Storage
 * and return the download URL without rebuilding the product UI.
 */
export async function prepareProductImage({
  imageUrl = "",
  file = null,
} = {}) {
  if (file) {
    throw new Error("Direct image upload is not enabled yet.");
  }

  return normalizeProductImageUrl(imageUrl);
}
