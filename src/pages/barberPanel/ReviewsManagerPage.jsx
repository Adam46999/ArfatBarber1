// src/pages/barberPanel/ReviewsManagerPage.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
} from "firebase/firestore";

const BARBER_ID = "arfat";
const ARCHIVE_KEEP_DAYS = 14; // ✅ مدة بقاء التقييم بعد "حذفه" (مثل الأدوار الملغاة)

function addDaysTimestamp(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function starsLabel(n) {
  const v = Math.max(0, Math.min(5, Number(n || 0)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}
function safeLower(v) {
  return (v || "").toString().toLowerCase();
}

export default function ReviewsManagerPage() {
  const [tab, setTab] = useState("reviews"); // reviews | blocked | archived

  // Reviews (active)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Archived
  const [archived, setArchived] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Search/filter
  const [qText, setQText] = useState("");
  const [stars, setStars] = useState("all");

  // Blocked
  const [blocked, setBlocked] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const reviewsCol = collection(db, "barbers", BARBER_ID, "reviews");
  const summaryRef = doc(db, "barbers", BARBER_ID, "meta", "reviewsSummary");

  // ===== Fetch ACTIVE Reviews =====
  const fetchReviews = async ({ reset = false } = {}) => {
    if (loadingReviews) return;
    setLoadingReviews(true);

    try {
      let qBase = query(reviewsCol, orderBy("createdAt", "desc"), limit(50));

      if (!reset && lastDoc) {
        qBase = query(
          reviewsCol,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(50),
        );
      }

      const snap = await getDocs(qBase);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ✅ هاي السطرين هم الحل
      const onlyActive = docs.filter(
        (r) => (r.status || "active") === "active",
      );

      if (reset) setReviews(onlyActive);
      else setReviews((p) => [...p, ...onlyActive]);

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 50);
    } catch (e) {
      console.error("fetchReviews error:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  // ===== Fetch Blocked (barber-scoped) =====
  const fetchBlocked = async () => {
    if (loadingBlocked) return;
    setLoadingBlocked(true);
    try {
      const ref = collection(db, "barbers", BARBER_ID, "blockedPhones");
      const snap = await getDocs(ref);
      setBlocked(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoadingBlocked(false);
    }
  };
  // ===== Fetch ARCHIVED Reviews (Prototype بدون Index) =====
  const fetchArchived = async () => {
    if (loadingArchived) return;
    setLoadingArchived(true);
    try {
      const qAll = query(reviewsCol, orderBy("createdAt", "desc"), limit(200));
      const snap = await getDocs(qAll);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ✅ فلترة محلية
      const onlyArchived = docs.filter((r) => r.status === "archived");
      setArchived(onlyArchived);
    } catch (e) {
      console.error("fetchArchived error:", e);
    } finally {
      setLoadingArchived(false);
    }
  };

  useEffect(() => {
    fetchReviews({ reset: true });
    fetchBlocked();
    fetchArchived();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Block/Unblock (barber + global) =====
  const blockPhoneEverywhere = async (phoneKey, reviewId) => {
    if (!phoneKey) return;

    await setDoc(
      doc(db, "barbers", BARBER_ID, "blockedPhones", String(phoneKey)),
      {
        phoneKey: String(phoneKey),
        from: "reviews",
        fromBarberId: BARBER_ID,
        reviewId: reviewId || null,
        blockedAt: serverTimestamp(),
      },
    );

    // ✅ هذا اللي يخليه يظهر في صفحة /blocked-phones
    await setDoc(doc(db, "blockedPhones", String(phoneKey)), {
      phoneKey: String(phoneKey),
      from: "reviews",
      fromBarberId: BARBER_ID,
      reviewId: reviewId || null,
      blockedAt: serverTimestamp(),
    });

    await fetchBlocked();
  };

  const unblockPhoneEverywhere = async (phoneKey) => {
    if (!phoneKey) return;

    await deleteDoc(
      doc(db, "barbers", BARBER_ID, "blockedPhones", String(phoneKey)),
    );
    await deleteDoc(doc(db, "blockedPhones", String(phoneKey)));

    await fetchBlocked();
  };

  // ===== Summary helpers =====
  function safeSummary(data) {
    return (
      data || {
        count: 0,
        sum: 0,
        byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        tagCounts: {},
      }
    );
  }

  function decSummary(cur, rating, tags = []) {
    const r = Number(rating || 0);
    const next = {
      ...cur,
      count: Math.max(0, Number(cur.count || 0) - 1),
      sum: Math.max(0, Number(cur.sum || 0) - r),
      byStar: { ...(cur.byStar || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) },
      tagCounts: { ...(cur.tagCounts || {}) },
    };

    if (r >= 1 && r <= 5)
      next.byStar[r] = Math.max(0, Number(next.byStar[r] || 0) - 1);
    (Array.isArray(tags) ? tags : []).forEach((k) => {
      next.tagCounts[k] = Math.max(0, Number(next.tagCounts[k] || 0) - 1);
      if (next.tagCounts[k] === 0) delete next.tagCounts[k];
    });

    return next;
  }

  function incSummary(cur, rating, tags = []) {
    const r = Number(rating || 0);
    const next = {
      ...cur,
      count: Number(cur.count || 0) + 1,
      sum: Number(cur.sum || 0) + r,
      byStar: { ...(cur.byStar || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) },
      tagCounts: { ...(cur.tagCounts || {}) },
    };

    if (r >= 1 && r <= 5) next.byStar[r] = Number(next.byStar[r] || 0) + 1;
    (Array.isArray(tags) ? tags : []).forEach((k) => {
      next.tagCounts[k] = Number(next.tagCounts[k] || 0) + 1;
    });

    return next;
  }

  // ===== Archive Review (instead of delete) =====
  const archiveReview = async (reviewId) => {
    if (!reviewId) return;

    await runTransaction(db, async (tx) => {
      const reviewRef = doc(db, "barbers", BARBER_ID, "reviews", reviewId);

      const [rSnap, sSnap] = await Promise.all([
        tx.get(reviewRef),
        tx.get(summaryRef),
      ]);
      if (!rSnap.exists()) return;

      const r = rSnap.data();
      if (r.status === "archived") return;

      const cur = safeSummary(sSnap.exists() ? sSnap.data() : null);
      const rating = r.rating ?? r.stars ?? 0;
      const tags = r.tags || [];

      const next = decSummary(cur, rating, tags);

      tx.set(
        reviewRef,
        {
          status: "archived",
          archivedAt: serverTimestamp(),
          purgeAt: addDaysTimestamp(ARCHIVE_KEEP_DAYS),
        },
        { merge: true },
      );

      tx.set(
        summaryRef,
        {
          ...next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    setReviews((p) => p.filter((x) => x.id !== reviewId));
    await fetchArchived();
  };

  // ===== Restore Review =====
  const restoreReview = async (reviewId) => {
    if (!reviewId) return;

    await runTransaction(db, async (tx) => {
      const reviewRef = doc(db, "barbers", BARBER_ID, "reviews", reviewId);

      const [rSnap, sSnap] = await Promise.all([
        tx.get(reviewRef),
        tx.get(summaryRef),
      ]);
      if (!rSnap.exists()) return;

      const r = rSnap.data();
      if (r.status !== "archived") return;

      const cur = safeSummary(sSnap.exists() ? sSnap.data() : null);
      const rating = r.rating ?? r.stars ?? 0;
      const tags = r.tags || [];

      const next = incSummary(cur, rating, tags);

      tx.set(
        reviewRef,
        {
          status: "active",
          restoredAt: serverTimestamp(),
          purgeAt: null,
        },
        { merge: true },
      );

      tx.set(
        summaryRef,
        {
          ...next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    await fetchReviews({ reset: true });
    await fetchArchived();
  };

  // ===== Hard delete archived (manual) =====
  const deleteArchivedPermanently = async (reviewId) => {
    if (!reviewId) return;
    await deleteDoc(doc(db, "barbers", BARBER_ID, "reviews", reviewId));
    setArchived((p) => p.filter((x) => x.id !== reviewId));
  };

  // ===== Filtered ACTIVE Reviews (client-side) =====
  const filteredReviews = useMemo(() => {
    const t = safeLower(qText).trim();
    return reviews.filter((r) => {
      const rStars = Number(r.rating || r.stars || 0);
      const phone = r.phoneKey || r.phoneE164 || r.phone || "";
      const msg = r.comment || r.message || r.text || "";
      const matchStars = stars === "all" ? true : rStars === Number(stars);
      const matchText =
        !t || safeLower(phone).includes(t) || safeLower(msg).includes(t);
      return matchStars && matchText;
    });
  }, [reviews, qText, stars]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-black">إدارة التقييمات</h1>

        <div className="flex gap-2 flex-wrap">
          <button
            className={`px-3 py-2 rounded-lg text-sm font-black border ${
              tab === "reviews" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setTab("reviews")}
          >
            التقييمات
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm font-black border ${
              tab === "blocked" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setTab("blocked")}
          >
            الأرقام المحظورة
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm font-black border ${
              tab === "archived" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setTab("archived")}
          >
            محذوفة مؤقتًا
          </button>
        </div>
      </div>

      {tab === "reviews" && (
        <>
          <div className="bg-white border rounded-xl p-3 mb-4">
            <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
              <input
                className="border rounded-lg px-3 py-2 w-full md:w-1/2"
                placeholder="بحث (رقم / نص التقييم)"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
              <select
                className="border rounded-lg px-3 py-2 w-full md:w-48"
                value={stars}
                onChange={(e) => setStars(e.target.value)}
              >
                <option value="all">كل النجوم</option>
                <option value="5">5 نجوم</option>
                <option value="4">4 نجوم</option>
                <option value="3">3 نجوم</option>
                <option value="2">2 نجوم</option>
                <option value="1">1 نجمة</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredReviews.map((r) => {
              const phoneKey = r.phoneKey || r.phoneE164 || r.phone || null;
              const rStars = Number(r.rating || r.stars || 0);
              const msg = r.comment || r.message || r.text || "";
              const isBlocked = !!blocked.find(
                (b) => b.id === String(phoneKey),
              );

              return (
                <div key={r.id} className="bg-white border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black truncate">زبون</div>
                      <div className="text-sm opacity-80">
                        {starsLabel(rStars)}
                      </div>
                      {phoneKey ? (
                        <div className="text-xs opacity-70 mt-1">
                          {String(phoneKey)}
                        </div>
                      ) : (
                        <div className="text-xs text-rose-600 mt-1 font-bold">
                          لا يوجد رقم داخل بيانات التقييم (لن يمكن الحظر)
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        className="px-3 py-2 rounded-lg border text-sm font-black"
                        onClick={() => archiveReview(r.id)}
                      >
                        حذف (مؤقت)
                      </button>

                      {!isBlocked ? (
                        <button
                          className="px-3 py-2 rounded-lg border text-sm font-black"
                          disabled={!phoneKey}
                          onClick={() =>
                            blockPhoneEverywhere(String(phoneKey), r.id)
                          }
                        >
                          حظر الرقم
                        </button>
                      ) : (
                        <button
                          className="px-3 py-2 rounded-lg border text-sm font-black"
                          onClick={() =>
                            unblockPhoneEverywhere(String(phoneKey))
                          }
                        >
                          فك الحظر
                        </button>
                      )}
                    </div>
                  </div>

                  {msg ? (
                    <p className="mt-3 text-sm leading-relaxed">{msg}</p>
                  ) : null}
                </div>
              );
            })}

            {filteredReviews.length === 0 && (
              <div className="bg-white border rounded-xl p-6 text-center opacity-80">
                لا يوجد تقييمات.
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            {hasMore ? (
              <button
                className="px-4 py-2 rounded-lg border font-black"
                onClick={() => fetchReviews({ reset: false })}
                disabled={loadingReviews}
              >
                {loadingReviews ? "جاري التحميل..." : "تحميل المزيد"}
              </button>
            ) : (
              <div className="text-sm opacity-70">لا يوجد المزيد.</div>
            )}
          </div>
        </>
      )}

      {tab === "blocked" && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-black">الأرقام المحظورة</div>
            <button
              className="px-3 py-2 rounded-lg border text-sm font-black"
              onClick={fetchBlocked}
            >
              تحديث
            </button>
          </div>

          {loadingBlocked ? (
            <div className="opacity-70">جاري التحميل...</div>
          ) : blocked.length === 0 ? (
            <div className="opacity-80">لا يوجد أرقام محظورة.</div>
          ) : (
            <div className="space-y-2">
              {blocked.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="font-mono text-sm">{b.id}</div>
                  <button
                    className="px-3 py-2 rounded-lg border text-sm font-black"
                    onClick={() => unblockPhoneEverywhere(b.id)}
                  >
                    فك الحظر
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "archived" && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-black">
              محذوفة مؤقتًا (تبقى {ARCHIVE_KEEP_DAYS} يوم)
            </div>
            <button
              className="px-3 py-2 rounded-lg border text-sm font-black"
              onClick={fetchArchived}
            >
              تحديث
            </button>
          </div>

          {loadingArchived ? (
            <div className="opacity-70">جاري التحميل...</div>
          ) : archived.length === 0 ? (
            <div className="opacity-80">لا يوجد تقييمات مؤرشفة.</div>
          ) : (
            <div className="space-y-3">
              {archived.map((r) => {
                const phoneKey = r.phoneKey || r.phoneE164 || r.phone || "";
                const rStars = Number(r.rating || r.stars || 0);
                const msg = r.comment || r.message || r.text || "";
                return (
                  <div key={r.id} className="border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black">زبون</div>
                        <div className="text-sm opacity-80">
                          {starsLabel(rStars)}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {String(phoneKey)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-2 rounded-lg border text-sm font-black"
                          onClick={() => restoreReview(r.id)}
                        >
                          استرجاع
                        </button>
                        <button
                          className="px-3 py-2 rounded-lg border text-sm font-black"
                          onClick={() => deleteArchivedPermanently(r.id)}
                        >
                          حذف نهائي
                        </button>
                      </div>
                    </div>

                    {msg ? (
                      <p className="mt-3 text-sm leading-relaxed">{msg}</p>
                    ) : null}

                    {r.purgeAt ? (
                      <div className="mt-2 text-xs opacity-70">
                        حذف تلقائي بعد:{" "}
                        {typeof r.purgeAt?.toDate === "function"
                          ? r.purgeAt.toDate().toLocaleString()
                          : new Date(r.purgeAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
