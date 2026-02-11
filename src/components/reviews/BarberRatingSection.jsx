/* eslint-disable no-empty */
import { useEffect, useMemo, useRef, useState } from "react";
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
import { MessageSquare } from "lucide-react";
import {
  toILPhoneE164,
  isILPhoneE164,
  normalizeDigits,
} from "../../utils/phone";

/* ================== CONFIG ================== */
const BARBER_ID = "arfat";
const INITIAL_LIMIT = 3;
const PAGE_LIMIT = 6;

/* ================== HELPERS ================== */
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function isActiveReview(r) {
  const s = String(r?.status || "active").toLowerCase();
  return !["archived", "deleted", "removed", "hidden"].includes(s);
}

function toDateSafe(v) {
  if (!v) return null;
  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof v?.seconds === "number") {
    const d = new Date(v.seconds * 1000);
    return !Number.isNaN(d.getTime()) ? d : null;
  }
  if (v instanceof Date) return !Number.isNaN(v.getTime()) ? v : null;
  const d = new Date(v);
  return !Number.isNaN(d.getTime()) ? d : null;
}

function formatTimeAgo(createdAt) {
  const d = toDateSafe(createdAt);
  if (!d) return "";

  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "الآن";
  const min = Math.floor(sec / 60);
  if (min < 60) return `قبل ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `قبل ${day} يوم`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `قبل ${wk} أسبوع`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `قبل ${mo} شهر`;
  const yr = Math.floor(day / 365);
  return `قبل ${yr} سنة`;
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function buildAvatar(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    parts.length === 0
      ? "Z"
      : (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();

  const hue = hashHue(String(name || "customer"));
  return { initials, bg: `hsl(${hue} 35% 28%)` };
}

function prettyName(name) {
  const s = String(name || "").trim();
  if (!s) return "زبون";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0] || "";
  return `${first} ${lastInitial}.`;
}

/* ================== STARS ================== */
function StarRow({ value, onChange, readonly = false, size = 22 }) {
  const v = clamp(Number(value || 0), 0, 5);
  return (
    <div className="flex flex-row-reverse items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i < Math.round(v);
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(i + 1)}
            className={[
              "transition-transform",
              readonly
                ? "cursor-default"
                : "cursor-pointer active:scale-95 hover:scale-110",
              on ? "text-gold" : "text-gray-300",
            ].join(" ")}
            style={{ fontSize: size }}
            aria-label={`${i + 1} stars`}
          >
            ★
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

function RatingBars({ byStar, total }) {
  const t = Number(total || 0);
  if (!t) return null;

  const rows = [
    { star: 5, n: Number(byStar?.[5] || 0) },
    { star: 4, n: Number(byStar?.[4] || 0) },
    { star: 3, n: Number(byStar?.[3] || 0) },
    { star: 2, n: Number(byStar?.[2] || 0) },
    { star: 1, n: Number(byStar?.[1] || 0) },
  ];

  return (
    <div className="mt-5 grid gap-2">
      {rows.map((row) => {
        const pct = Math.round((row.n / t) * 100);
        return (
          <div key={row.star} className="flex items-center gap-3">
            <div className="w-10 text-xs font-bold text-right">{row.star}★</div>

            <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gold/80"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="w-20 text-xs text-gray-600 text-left">
              {pct}%{row.n ? ` • ${row.n}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClampText({ text, expanded }) {
  if (expanded) return <div className="whitespace-pre-wrap">{text}</div>;

  // ✅ بدون line-clamp plugin
  return (
    <div
      style={{
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
      className="whitespace-pre-wrap"
    >
      {text}
    </div>
  );
}

/* ================== REVIEW CARD ================== */
function ReviewCard({ r, expanded, onToggle }) {
  const rating = Number(r.rating || 0);
  const comment = String(r.comment || "");
  const tags = Array.isArray(r.tags) ? r.tags : [];

  const rawName = String(
    r.customerName || r.userName || r.displayName || "",
  ).trim();
  const name = prettyName(rawName);
  const avatar = buildAvatar(name);

  const tagLabel = (k) => TAGS.find((t) => t.k === k)?.label || k;

  const timeAgo = formatTimeAgo(r.createdAt);
  const isLong = comment.trim().length > 140;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-row-reverse justify-between gap-3">
        <div className="flex flex-row-reverse items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-extrabold"
            style={{ backgroundColor: avatar.bg }}
            title={rawName || "زبون"}
          >
            {avatar.initials}
          </div>

          <div className="text-right min-w-0">
            <div className="font-bold truncate">{name || "زبون"}</div>
            {!!timeAgo && (
              <div className="text-xs text-gray-500 mt-0.5">{timeAgo}</div>
            )}
          </div>
        </div>

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

      <div className="mt-3 text-sm text-right text-gray-700">
        <ClampText text={comment || "(بدون تعليق)"} expanded={expanded} />

        {/* ✅ عرض المزيد / إظهار أقل */}
        {isLong && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-2 text-xs font-semibold text-gold hover:underline"
          >
            {expanded ? "إظهار أقل" : "عرض المزيد"}
          </button>
        )}
      </div>
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

  const [reviews, setReviews] = useState([]);

  // pagination
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // ✅ المزيد / إظهار أقل لقائمة التقييمات
  const [expandedList, setExpandedList] = useState(false);

  // ✅ Accordion للتعليقات: واحد فقط مفتوح
  const [openReviewId, setOpenReviewId] = useState(null);

  // form
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // refs for smooth UX
  const listTopRef = useRef(null);
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  const count = Number(summary.count || 0);
  const avg = count > 0 ? summary.sum / count : 0;

  const summaryRef = doc(db, "barbers", BARBER_ID, "meta", "reviewsSummary");
  const reviewsCol = collection(db, "barbers", BARBER_ID, "reviews");

  const visibleReviews = useMemo(() => {
    return expandedList ? reviews : reviews.slice(0, INITIAL_LIMIT);
  }, [reviews, expandedList]);

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

      const pageItems = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isActiveReview);

      const newLast = snap.docs[snap.docs.length - 1] || null;

      if (reset) setReviews(pageItems);
      else setReviews((prev) => [...prev, ...pageItems]);

      setLastDoc(newLast);

      const expected = reset ? INITIAL_LIMIT : PAGE_LIMIT;
      setHasMore(snap.docs.length === expected);

      if (reset) {
        setExpandedList(false);
        setOpenReviewId(null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ss = await getDoc(summaryRef);
      if (ss.exists()) setSummary(ss.data());
      await fetchReviewsPage({ reset: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    setOpen(false);
    setCustomerName("");
    setPhone("");
    setComment("");
    setTags([]);
    setRating(5);
    setSubmitting(false);

    const ss = await getDoc(summaryRef);
    if (ss.exists()) setSummary(ss.data());

    setLastDoc(null);
    await fetchReviewsPage({ reset: true });

    // رجّع المستخدم للقسم بشكل لطيف
    setTimeout(() => {
      try {
        document.getElementById("ratings")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        // eslint-disable-next-line no-empty
      } catch {}
    }, 50);
  }

  async function onMoreClick() {
    // أول مرة: وسّع القائمة
    if (!expandedList) {
      setExpandedList(true);

      // سكرول ناعم لأعلى القائمة (عشان يحس بالاتساع)
      setTimeout(() => {
        try {
          listTopRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          // eslint-disable-next-line no-empty
        } catch {}
      }, 40);

      // حمّل صفحة إضافية مرة واحدة (لو موجود)
      if (hasMore && !loadingMore) {
        await fetchReviewsPage({ reset: false });
      }
      return;
    }

    // بعدها: تحميل المزيد
    if (hasMore && !loadingMore) {
      await fetchReviewsPage({ reset: false });
    }
  }

  function onLessClick() {
    // ✅ “إظهار أقل” أسلس:
    // 1) سكّر أي تعليق مفتوح
    setOpenReviewId(null);

    // 2) سكرول لأعلى القائمة قبل التصغير (يقلل jump)
    try {
      listTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // eslint-disable-next-line no-empty
    } catch {}

    // 3) بعد لحظة صغيرة، صغّر
    setTimeout(() => {
      setExpandedList(false);

      // 4) تثبيت لطيف بعد التصغير
      setTimeout(() => {
        try {
          listTopRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } catch {}
      }, 120);
    }, 180);
  }

  function openFormAndScroll() {
    setOpen(true);
    setTimeout(() => {
      try {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => nameInputRef.current?.focus?.(), 200);
      } catch {}
    }, 60);
  }

  return (
    <section
      id="ratings"
      dir="rtl"
      className="relative bg-white px-4 py-16 sm:py-20 font-body overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-10 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <SectionTitle
        icon={
          <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center">
            <span className="text-gold text-xl font-black">★</span>
          </div>
        }
      >
        تقييمات وتجربة الزبائن
      </SectionTitle>

      <div className="max-w-3xl mx-auto mt-6 bg-[#fcfaf7] p-5 sm:p-6 rounded-3xl shadow-lg border border-gold/10 ring-1 ring-black/5">
        {/* ✅ Summary */}
        <div className="text-right">
          <div className="text-4xl font-black">
            {count ? avg.toFixed(1) : "—"}
          </div>

          <div className="mt-1">
            <StarRow value={avg} readonly />
          </div>

          <div className="text-sm text-gray-600 mt-1">
            {count ? `${count} تقييم` : "لا يوجد تقييمات بعد"}
          </div>

          {!!count && <RatingBars byStar={summary.byStar} total={count} />}
        </div>

        {/* Header row - mobile perfect */}
        <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="font-bold text-right">آخر الآراء</div>

          <button
            onClick={openFormAndScroll}
            className="w-full sm:w-auto bg-gold px-4 py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <MessageSquare className="w-4 h-4" />
            اكتب تقييم
          </button>
        </div>

        {loading ? (
          <div className="mt-4 text-gray-500 text-right">جارٍ التحميل…</div>
        ) : (
          <>
            {/* anchor for smooth list scroll */}
            <div ref={listTopRef} />

            <div className="mt-4 grid gap-4 sm:gap-5">
              {visibleReviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  r={r}
                  expanded={openReviewId === r.id}
                  onToggle={() =>
                    setOpenReviewId((prev) => (prev === r.id ? null : r.id))
                  }
                />
              ))}
            </div>

            {/* ✅ List controls: المزيد / إظهار أقل */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-center">
              {(hasMore || !expandedList) && reviews.length > 0 && (
                <button
                  onClick={onMoreClick}
                  disabled={loadingMore}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl font-extrabold border border-gray-200 bg-white hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {expandedList
                    ? loadingMore
                      ? "جارٍ التحميل…"
                      : "تحميل المزيد"
                    : "المزيد"}
                </button>
              )}

              {expandedList && (
                <button
                  onClick={onLessClick}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl font-extrabold border border-gold/25 bg-gold/10 hover:bg-gold/15 transition"
                >
                  إظهار أقل
                </button>
              )}
            </div>
          </>
        )}

        {/* Form */}
        {open && (
          <div ref={formRef} className="mt-7 border-t pt-6">
            <div className="grid gap-3">
              <input
                ref={nameInputRef}
                className="w-full border rounded-2xl px-4 py-3"
                placeholder="اسمك"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <input
                className="w-full border rounded-2xl px-4 py-3"
                placeholder="رقم الهاتف"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="flex justify-end">
                <StarRow value={rating} onChange={setRating} />
              </div>

              <textarea
                className="w-full border rounded-2xl px-4 py-3 min-h-[110px]"
                placeholder="تعليق (اختياري)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <button
                onClick={submitReview}
                disabled={submitting}
                className="mt-1 w-full bg-primary text-white py-3 rounded-2xl font-extrabold disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {submitting ? "جارٍ الإرسال…" : "إرسال التقييم"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
