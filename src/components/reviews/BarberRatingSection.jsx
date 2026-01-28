// src/components/reviews/BarberRatingSection.jsx
import { useEffect, useMemo, useState } from "react";
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
} from "firebase/firestore";
import { Star, MessageSquare, ShieldAlert, TrendingUp } from "lucide-react";
import {
  toILPhoneE164,
  isILPhoneE164,
  normalizeDigits,
} from "../../utils/phone";

// ✅ barber scope
const BARBER_ID = "arfat";

// ✅ DEV: عطّل الحماية التجريبية أثناء التطوير
const DEV_DISABLE_REVIEW_GUARDS = true;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function percent(n, total) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

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
            className={`p-1 rounded-lg transition ${
              readonly ? "cursor-default" : "hover:bg-gold/10"
            }`}
            aria-label={`star-${i}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={`${active ? "text-gold" : "text-gray-300"}`}
              fill={active ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

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

function pickTopTags(tagCounts = {}, top = 3) {
  const map = new Map(TAGS.map((t) => [t.k, t.label]));
  return Object.entries(tagCounts)
    .map(([k, v]) => ({ k, v: Number(v || 0), label: map.get(k) || k }))
    .sort((a, b) => b.v - a.v)
    .slice(0, top)
    .filter((x) => x.v > 0);
}

function getOrCreateDeviceId() {
  const KEY = "reviews_device_id_v1";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

function canSubmitNowCooldown() {
  const KEY = "reviews_last_submit_ts_v1";
  const last = Number(localStorage.getItem(KEY) || 0);
  const now = Date.now();

  const cooldownMs = 2 * 60 * 1000;
  if (last && now - last < cooldownMs) return false;

  localStorage.setItem(KEY, String(now));
  return true;
}

function ReviewCard({ r }) {
  const rating = Number(r.rating || 0);
  const comment = r.comment || "";
  const tags = Array.isArray(r.tags) ? r.tags : [];

  const tagLabel = (k) => TAGS.find((t) => t.k === k)?.label || k;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-row-reverse items-start justify-between gap-3">
        <div className="text-right">
          <div className="font-extrabold text-gray-900">زبون</div>
          <div className="text-xs text-gray-500 mt-0.5">تقييم عام</div>
        </div>
        <StarRow value={rating} readonly size={18} />
      </div>

      {tags.length ? (
        <div className="mt-3 flex flex-row-reverse flex-wrap gap-2">
          {tags.slice(0, 5).map((k) => (
            <span
              key={k}
              className="text-xs px-2.5 py-1 rounded-full bg-[#f6f2ea] border border-gold/20 text-gray-700 font-bold"
            >
              {tagLabel(k)}
            </span>
          ))}
        </div>
      ) : null}

      {comment ? (
        <p className="text-right text-sm text-gray-700 mt-3 leading-relaxed">
          {comment}
        </p>
      ) : (
        <p className="text-right text-sm text-gray-400 mt-3">(بدون تعليق)</p>
      )}
    </div>
  );
}

export default function BarberRatingSection() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    count: 0,
    sum: 0,
    byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    tagCounts: {},
  });
  const [latest, setLatest] = useState([]);

  // form
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const count = Number(summary.count || 0);
  const avg = count > 0 ? Number(summary.sum || 0) / count : 0;
  const topTags = useMemo(() => pickTopTags(summary.tagCounts, 3), [summary]);

  const summaryRef = doc(db, "barbers", BARBER_ID, "meta", "reviewsSummary");
  const reviewsCol = collection(db, "barbers", BARBER_ID, "reviews");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const ss = await getDoc(summaryRef);
      if (ss.exists()) setSummary(ss.data());

      // // ✅ أهم تعديل: اعرض فقط active (الفلترة محليًا)
      const qLatest = query(
        reviewsCol,
        orderBy("createdAt", "desc"),
        limit(20),
      );
      const snap = await getDocs(qLatest);

      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ✅ فلترة محلية: الزبون يشوف active فقط
      setLatest(
        rows.filter((r) => (r.status || "active") === "active").slice(0, 3),
      );
    } catch (e) {
      console.error("REVIEWS fetchAll error:", e);
      setMsg({
        type: "error",
        text:
          e?.message ||
          "فشل تحميل التقييمات. افتح Console وشوف الخطأ بالتفصيل.",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTag = (k) => {
    setTags((prev) => {
      const has = prev.includes(k);
      if (has) return prev.filter((x) => x !== k);
      if (prev.length >= 3) return prev;
      return [...prev, k];
    });
  };

  function normalizePhoneKey(input) {
    const local = normalizeDigits(input);
    const e164 = toILPhoneE164(input);
    const hasE164 = isILPhoneE164(e164);
    if (hasE164) return e164;
    if (local) return local;
    return "";
  }

  const submitReview = async () => {
    setMsg({ type: "", text: "" });

    const phoneKey = normalizePhoneKey(phone.trim());
    if (!phoneKey) {
      setMsg({ type: "error", text: "رقم الهاتف غير صحيح." });
      return;
    }
    if (rating < 1 || rating > 5) {
      setMsg({ type: "error", text: "اختار تقييم من 1 إلى 5." });
      return;
    }

    const deviceId = getOrCreateDeviceId();
    const createdAtMs = Date.now(); // ✅ مهم

    setSubmitting(true);
    try {
      if (!DEV_DISABLE_REVIEW_GUARDS) {
        if (!canSubmitNowCooldown()) {
          throw new Error("استنى شوي قبل ما تبعث تقييم ثاني (حماية تجريبية).");
        }

        const blockedRef = doc(
          db,
          "barbers",
          BARBER_ID,
          "blockedPhones",
          String(phoneKey),
        );
        const blockedSnap = await getDoc(blockedRef);
        if (blockedSnap.exists()) {
          throw new Error("هذا الرقم محظور من إرسال تقييمات.");
        }
      }

      await runTransaction(db, async (tx) => {
        const sSnap = await tx.get(summaryRef);

        const cur = sSnap.exists()
          ? sSnap.data()
          : {
              count: 0,
              sum: 0,
              byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              tagCounts: {},
            };

        const reviewRef = doc(reviewsCol);
        tx.set(reviewRef, {
          barberId: BARBER_ID,
          phoneKey,
          deviceId,
          rating,
          tags,
          comment: comment.trim(),
          status: "active",
          createdAt: serverTimestamp(),
          createdAtMs, // ✅ هذا اللي رح نعتمد عليه بالترتيب
        });

        const newCount = Number(cur.count || 0) + 1;
        const newSum = Number(cur.sum || 0) + rating;

        const byStar = {
          ...(cur.byStar || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
        };
        byStar[rating] = Number(byStar[rating] || 0) + 1;

        const tagCounts = { ...(cur.tagCounts || {}) };
        tags.forEach((k) => (tagCounts[k] = Number(tagCounts[k] || 0) + 1));

        tx.set(
          summaryRef,
          {
            count: newCount,
            sum: newSum,
            byStar,
            tagCounts,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });

      setMsg({ type: "success", text: "✅ تم إرسال تقييمك. شكراً!" });
      setRating(5);
      setTags([]);
      setComment("");
      setPhone("");
      setOpen(false);
      await fetchAll();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "صار خطأ." });
    }
    setSubmitting(false);
  };

  return (
    <section
      id="ratings"
      dir="rtl"
      className="bg-white py-14 px-4 text-primary font-body scroll-mt-28 md:scroll-mt-32"
      style={{ scrollMarginTop: 120 }}
    >
      <SectionTitle
        icon={
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/15 text-gold shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
        }
      >
        <span className="tracking-wide text-lg font-semibold">
          تقييمات وتجربة الزبائن
        </span>
      </SectionTitle>

      <div className="max-w-3xl mx-auto mt-6">
        <div className="bg-[#fcfaf7] border border-gold/20 rounded-3xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row-reverse gap-6 md:items-center md:justify-between">
            <div className="text-right">
              <div className="text-4xl font-black text-gray-900 leading-none">
                {count ? avg.toFixed(1) : "—"}
              </div>
              <div className="mt-2 flex flex-row-reverse items-center gap-2">
                <StarRow value={Math.round(avg)} readonly />
                <span className="text-sm text-gray-600">
                  {count ? `${count} تقييم` : "لا يوجد تقييمات بعد"}
                </span>
              </div>

              {!DEV_DISABLE_REVIEW_GUARDS && (
                <div className="mt-3 inline-flex flex-row-reverse items-center gap-2 text-xs px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-700">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>
                    بدون OTP — حماية تجريبية (نفس الجهاز) + منع المحظورين
                  </span>
                </div>
              )}

              {topTags.length ? (
                <div className="mt-4">
                  <div className="text-sm font-extrabold text-gray-900 text-right">
                    أقوى نقاط حسب الزبائن
                  </div>
                  <div className="mt-2 flex flex-row-reverse flex-wrap gap-2">
                    {topTags.map((t) => (
                      <span
                        key={t.k}
                        className="text-xs px-3 py-1.5 rounded-full bg-white border border-gold/25 text-gray-800 font-black"
                      >
                        {t.label}{" "}
                        <span className="text-gray-500 font-bold">({t.v})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="w-full md:w-[360px] space-y-2">
              {[5, 4, 3, 2, 1].map((s) => {
                const n = Number(summary.byStar?.[s] || 0);
                const p = percent(n, count);
                return (
                  <div
                    key={s}
                    className="flex flex-row-reverse items-center gap-3"
                  >
                    <div className="w-10 text-right text-sm font-bold">
                      {s}★
                    </div>
                    <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-gold"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <div className="w-12 text-left text-xs text-gray-600">
                      {p}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-row-reverse items-center justify-between">
              <div className="text-right font-extrabold text-gray-900">
                آخر الآراء
              </div>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex flex-row-reverse items-center gap-2 px-4 py-2 rounded-2xl bg-gold text-primary font-black shadow-sm hover:bg-yellow-400 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>اكتب تقييم</span>
              </button>
            </div>

            {loading ? (
              <div className="mt-4 text-right text-gray-500">جارٍ التحميل…</div>
            ) : latest.length ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {latest.map((r) => (
                  <ReviewCard key={r.id} r={r} />
                ))}
              </div>
            ) : (
              <div className="mt-4 text-right text-gray-500">
                ما في تقييمات لحد الآن — خليك أول واحد 😄
              </div>
            )}
          </div>

          {open && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              {msg?.text ? (
                <div
                  className={`mt-4 rounded-2xl border p-3 text-right text-sm font-bold ${
                    msg.type === "error"
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}
                >
                  {msg.text}
                </div>
              ) : null}

              <div className="text-right">
                <label className="block text-sm font-bold mb-2">
                  رقم الهاتف
                </label>
                <input
                  className="w-full border border-gray-300 rounded-2xl px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-gold text-right"
                  placeholder="مثال: 05x..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </div>

              <div className="mt-4 flex flex-col md:flex-row-reverse md:items-center md:justify-between gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold mb-2">التقييم</div>
                  <StarRow value={rating} onChange={setRating} />
                </div>

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting}
                  className={`w-full md:w-auto px-6 py-3 rounded-2xl font-black shadow-sm transition ${
                    submitting
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-primary text-white hover:opacity-90"
                  }`}
                >
                  {submitting ? "جارٍ الإرسال..." : "إرسال التقييم"}
                </button>
              </div>

              <div className="mt-4 text-right">
                <div className="text-sm font-bold mb-2">
                  شو أكثر شغلات عجبتك؟ (اختار لحد 3)
                </div>
                <div className="flex flex-row-reverse flex-wrap gap-2">
                  {TAGS.map((t) => {
                    const active = tags.includes(t.k);
                    return (
                      <button
                        key={t.k}
                        type="button"
                        onClick={() => toggleTag(t.k)}
                        className={`text-xs px-3 py-2 rounded-full border font-black transition ${
                          active
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-800 border-gray-200 hover:border-gold/50"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 text-right">
                <label className="block text-sm font-bold mb-2">
                  تعليق (اختياري)
                </label>
                <textarea
                  className="w-full min-h-[90px] border border-gray-300 rounded-2xl px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-gold text-right"
                  placeholder="إذا بتحب… اكتب تعليق سريع"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={280}
                />
                <div className="mt-1 text-xs text-gray-500 text-right">
                  {comment.trim().length}/280
                </div>
              </div>

              {!DEV_DISABLE_REVIEW_GUARDS && (
                <div className="mt-4 text-xs text-gray-500 text-right">
                  * حماية تجريبية — نفس الجهاز ما بقدر يبعث تقييمين خلال دقيقتين
                  + الرقم المحظور لا يمكنه إرسال تقييم.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
