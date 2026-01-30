// src/components/reviews/reviewsApi.js
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

/**
 * حاولنا نخلي أسماء الحقول مرنة (لأنه مرات المشاريع بتختلف):
 * - barberId
 * - rating
 * - comment / text / message
 * - createdAt
 * - userName / customerName / displayName
 */

function normalizeReview(docSnap) {
  const d = docSnap.data() || {};
  return {
    id: docSnap.id,
    barberId: d.barberId,
    rating: Number(d.rating ?? d.stars ?? 0),
    comment: d.comment ?? d.text ?? d.message ?? "",
    createdAt: d.createdAt ?? d.timestamp ?? null,
    userName: d.userName ?? d.customerName ?? d.displayName ?? d.name ?? "",
    userId: d.userId ?? d.customerId ?? null,
    visible: d.visible ?? true,
    raw: d,
  };
}

export async function fetchLatestReviews({
  db,
  barberId,
  pageSize = 3,
  includeHidden = false,
}) {
  if (!barberId) return { items: [], lastDoc: null };

  // لو عندك فلترة visible بالمشروع، خليك consistent بين الزبون والحلاق
  const base = [
    collection(db, "reviews"),
    where("barberId", "==", barberId),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];

  // ما بنحط where("visible"==true) افتراضيًا عشان ما “يختفي” اشي عند طرف ويظهر عند طرف
  // انت إذا بدك تفعّلها، فعّلها بالطرفين معًا.
  const q = query(...base);

  const snap = await getDocs(q);
  const docs = snap.docs;
  const items = docs
    .map(normalizeReview)
    .filter((r) => (includeHidden ? true : r.visible !== false));

  return { items, lastDoc: docs.length ? docs[docs.length - 1] : null };
}

export async function fetchReviewsPage({
  db,
  barberId,
  pageSize = 10,
  afterDoc = null,
  includeHidden = false,
}) {
  if (!barberId) return { items: [], lastDoc: null };

  const parts = [
    collection(db, "reviews"),
    where("barberId", "==", barberId),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];

  const q = afterDoc ? query(...parts, startAfter(afterDoc)) : query(...parts);

  const snap = await getDocs(q);
  const docs = snap.docs;

  const items = docs
    .map(normalizeReview)
    .filter((r) => (includeHidden ? true : r.visible !== false));

  return { items, lastDoc: docs.length ? docs[docs.length - 1] : null };
}
