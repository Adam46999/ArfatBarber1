import { useEffect, useState } from "react";
import SectionTitle from "../common/SectionTitle";
import { db } from "../../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
} from "firebase/firestore";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import {
  toILPhoneE164,
  isILPhoneE164,
  normalizeDigits,
} from "../../utils/phone";

/* ================== CONFIG ================== */
const BARBER_ID = "arfat";
const DEV_DISABLE_REVIEW_GUARDS = true;

// عرض أول 3، وبعدها كل مرة "المزيد" يجيب 6
const INITIAL_LIMIT = 3;
const PAGE_LIMIT = 6;

/* ================== HELPERS ================== */
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function isActiveReview(r) {
  const s = String(r?.status || "active").toLowerCase();
  // أي حالة ما بنعرضها للزبون
  return !["archived", "deleted", "removed", "hidden"].includes(s);
}

/* ================== STARS ================== */
function StarRow({ value, onChange, readonly = false, size = 22 }) {
  const v = clamp(Number(value || 0), 0, 5);
  return (
    <div className="flex flex-row-reverse items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= v;
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(i)}
            className={`p-1 rounded-lg ${
              readonly ? "cursor-default" : "hover:bg-gold/10"
            }`}
          >
            <Star
              style={{ width: size, height: size }}
              className={active ? "text-gold" : "text-gray-300"}
              fill={active ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ================== TAGS ================== */
const TAGS = [
  { k: "clean", label: "نظافة" },
  { k: "on_time", label: "دقة بالمواعيد" },
  { k: "pro", label: "احتراف" },
  { k: "speed", label: "سرعة" },
  { k: "price", label: "سعر مناسب" },
  { k: "respect", label: "تعامل محترم" },
  { k: "hair_quality", label: "جودة قص الشعر" },
  { k: "vibe", label: "جو المكان" },
];

/* ================== REVIEW CARD ================== */
function ReviewCard({ r }) {
  const rating = Number(r.rating || 0);
  const comment = r.comment || "";
  const tags = Array.isArray(r.tags) ? r.tags : [];

  // ✅ اسم الزبون (للجديد) + fallback للقديم
  const name = String(
    r.customerName || r.userName || r.displayName || "",
  ).trim();

  const tagLabel = (k) => TAGS.find((t) => t.k === k)?.label || k;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-row-reverse justify-between">
        <div className="text-right font-bold">{name || "زبون"}</div>
        <StarRow value={rating} readonly size={18} />
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-row-reverse flex-wrap gap-2">
          {tags.map((k) => (
            <span
              key={k}
              className="text-xs px-2 py-1 rounded-full bg-[#f6f2ea] border border-gold/20"
            >
              {tagLabel(k)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-right text-gray-700">
        {comment || "(بدون تعليق)"}
      </p>
    </div>
  );
}

/* ================== MAIN ================== */
export default function BarberRatingSection() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [summary, setSummary] = useState({
    count: 0,
    sum: 0,
    byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  // بدل latest: نخزن القائمة المعروضة
  const [reviews, setReviews] = useState([]);

  // pagination
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [open, setOpen] = useState(false);

  // ✅ جديد: اسم الزبون
  const [customerName, setCustomerName] = useState("");

  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const count = Number(summary.count || 0);
  const avg = count > 0 ? summary.sum / count : 0;

  const summaryRef = doc(db, "barbers", BARBER_ID, "meta", "reviewsSummary");
  const reviewsCol = collection(db, "barbers", BARBER_ID, "reviews");

  async function fetchReviewsPage({ reset }) {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const base = [orderBy("createdAt", "desc")];

      let q;
      if (reset) {
        q = query(reviewsCol, ...base, limit(INITIAL_LIMIT));
      } else {
        if (!lastDoc) {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }
        q = query(reviewsCol, ...base, startAfter(lastDoc), limit(PAGE_LIMIT));
      }

      const snap = await getDocs(q);

      // فلترة غير النشط للزبون (بدون تغيير الداتا نفسها)
      const pageItems = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isActiveReview);

      const newLast = snap.docs[snap.docs.length - 1] || null;

      if (reset) {
        setReviews(pageItems);
      } else {
        setReviews((prev) => [...prev, ...pageItems]);
      }

      setLastDoc(newLast);

      // هل في احتمال يوجد المزيد؟
      // إذا رجع أقل من limit غالبًا خلصت.
      const expected = reset ? INITIAL_LIMIT : PAGE_LIMIT;
      setHasMore(snap.docs.length === expected);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  /* ================== FETCH ================== */
  useEffect(() => {
    (async () => {
      setLoading(true);

      const ss = await getDoc(summaryRef);
      if (ss.exists()) setSummary(ss.data());

      await fetchReviewsPage({ reset: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================== SUBMIT ================== */
  async function submitReview() {
    const nameTrimmed = customerName.trim();
    if (!nameTrimmed) return;

    const phoneKey =
      toILPhoneE164(phone) && isILPhoneE164(toILPhoneE164(phone))
        ? toILPhoneE164(phone)
        : normalizeDigits(phone);

    if (!phoneKey) return;

    setSubmitting(true);

    await runTransaction(db, async (tx) => {
      const sSnap = await tx.get(summaryRef);
      const cur = sSnap.exists()
        ? sSnap.data()
        : { count: 0, sum: 0, byStar: {} };

      const reviewRef = doc(reviewsCol);

      tx.set(reviewRef, {
        rating,
        tags,
        comment,
        status: "active",
        createdAt: serverTimestamp(),

        customerName: nameTrimmed,
        phoneKey,
      });

      tx.set(
        summaryRef,
        {
          count: cur.count + 1,
          sum: cur.sum + rating,
          byStar: {
            ...cur.byStar,
            [rating]: (cur.byStar?.[rating] || 0) + 1,
          },
        },
        { merge: true },
      );
    });

    // ✅ Reset
    setOpen(false);
    setCustomerName("");
    setPhone("");
    setComment("");
    setTags([]);
    setRating(5);
    setSubmitting(false);

    // ✅ Refresh: رجّع أول صفحة من جديد (عشان يظهر فورًا)
    const ss = await getDoc(summaryRef);
    if (ss.exists()) setSummary(ss.data());
    setLastDoc(null);
    await fetchReviewsPage({ reset: true });
  }

  /* ================== UI ================== */
  return (
    <section
      id="ratings"
      dir="rtl"
      className="relative bg-white px-4 py-20 font-body overflow-hidden"
    >
      {/* ديكور خفيف جداً */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-10 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <SectionTitle
        icon={
          <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-gold" />
          </div>
        }
      >
        تقييمات وتجربة الزبائن
      </SectionTitle>

      <div className="max-w-3xl mx-auto mt-6 bg-[#fcfaf7] p-6 rounded-3xl shadow-lg border border-gold/10 ring-1 ring-black/5 transition-transform duration-300 hover:-translate-y-1">
        <div className="text-right">
          <div className="text-4xl font-black">
            {count ? avg.toFixed(1) : "—"}
          </div>
          <StarRow value={Math.round(avg)} readonly />
          <div className="text-sm text-gray-600">{count} تقييم</div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center">
            <div className="font-bold">آخر الآراء</div>
            <button
              onClick={() => setOpen(!open)}
              className="bg-gold px-4 py-2 rounded-xl font-bold"
            >
              <MessageSquare className="inline w-4 h-4 ml-1" />
              اكتب تقييم
            </button>
          </div>

          {loading ? (
            <div className="mt-4 text-gray-500">جارٍ التحميل…</div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} r={r} />
                ))}
              </div>

              {/* ✅ زر المزيد */}
              {hasMore ? (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => fetchReviewsPage({ reset: false })}
                    disabled={loadingMore}
                    className="px-5 py-2 rounded-xl font-extrabold border border-gray-200 bg-white hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? "جارٍ التحميل…" : "المزيد"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {open && (
          <div className="mt-6 border-t pt-6">
            <input
              className="w-full border rounded-xl px-4 py-2 mb-3"
              placeholder="اسمك"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <input
              className="w-full border rounded-xl px-4 py-2 mb-3"
              placeholder="رقم الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <StarRow value={rating} onChange={setRating} />

            <textarea
              className="w-full border rounded-xl px-4 py-2 mt-3"
              placeholder="تعليق (اختياري)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <button
              onClick={submitReview}
              disabled={submitting}
              className="mt-4 w-full bg-primary text-white py-3 rounded-xl font-bold"
            >
              إرسال التقييم
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
