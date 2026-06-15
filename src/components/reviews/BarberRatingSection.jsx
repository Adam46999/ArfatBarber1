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

import {
  ArrowDown,
  CheckCircle2,
  MessageSquare,
  Quote,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { isILPhoneE164, toILPhoneE164 } from "../../utils/phone";

/* ================== الإعدادات ================== */

const BARBER_ID = "arfat";
const INITIAL_VISIBLE_REVIEWS = 3;
const PAGE_LIMIT = 6;
const FEATURED_POOL_LIMIT = 20;

const FEATURED_CHANGE_INTERVAL = 5000;
const FEATURED_FADE_OUT_DURATION = 300;
const FEATURED_FADE_IN_DURATION = 400;

/* ================== دوال مساعدة ================== */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isActiveReview(review) {
  const status = String(review?.status || "active").toLowerCase();

  return !["archived", "deleted", "removed", "hidden"].includes(status);
}

function toDateSafe(value) {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimeAgo(createdAt) {
  const date = toDateSafe(createdAt);

  if (!date) {
    return "";
  }

  const difference = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "الآن";
  }

  if (minutes < 60) {
    return `قبل ${minutes} دقيقة`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `قبل ${hours} ساعة`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `قبل ${days} يوم`;
  }

  const weeks = Math.floor(days / 7);

  if (weeks < 5) {
    return `قبل ${weeks} أسبوع`;
  }

  const months = Math.floor(days / 30);

  if (months < 12) {
    return `قبل ${months} شهر`;
  }

  const years = Math.floor(days / 365);

  return `قبل ${years} سنة`;
}

function getPublicName(name) {
  const value = String(name || "").trim();

  if (!value) {
    return "أحد الزبائن";
  }

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts.at(-1)[0]}.`;
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "ز";
  }

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

/* ================== النجوم ================== */

function StarRow({ value, onChange, readonly = false, size = 24 }) {
  const selected = clamp(Number(value || 0), 0, 5);

  return (
    <div
      className="flex flex-row-reverse items-center justify-center gap-1"
      role={readonly ? undefined : "radiogroup"}
      aria-label="اختيار عدد النجوم"
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const active = starValue <= Math.round(selected);

        return (
          <button
            key={starValue}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            role={readonly ? undefined : "radio"}
            aria-checked={readonly ? undefined : selected === starValue}
            aria-label={`${starValue} نجوم`}
            className={`rounded-md leading-none transition duration-200 ${
              readonly
                ? "cursor-default"
                : "cursor-pointer hover:-translate-y-1 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            } ${active ? "text-gold drop-shadow-sm" : "text-gray-300"}`}
            style={{
              fontSize: size,
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

/* ================== توزيع التقييمات ================== */

function RatingBars({ byStar, total }) {
  if (!total) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const amount = Number(byStar?.[star] || 0);
        const percentage = Math.round((amount / total) * 100);

        return (
          <div key={star} className="flex items-center gap-3">
            <span className="w-9 shrink-0 text-sm font-black text-gray-700">
              {star}

              <span className="mr-1 text-gold">★</span>
            </span>

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-l from-gold to-yellow-300 transition-all duration-700"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            <span className="w-11 shrink-0 text-left text-xs font-bold text-gray-500">
              {percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ================== محتوى التقييم المميز ================== */

function FeaturedReviewContent({ review }) {
  if (!review) {
    return null;
  }

  const name = getPublicName(
    review.customerName || review.userName || review.displayName,
  );

  const comment = String(review.comment || "").trim();

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-xs font-black text-gold">
          <Sparkles className="h-3.5 w-3.5" />
          تجربة مميزة
        </div>

        <StarRow value={review.rating} readonly size={18} />
      </div>

      <div className="mt-3 min-h-0 flex-1">
        <Quote className="mb-2 h-6 w-6 text-gold" />

        <p
          className="text-right text-base font-bold leading-7 text-white sm:text-lg sm:leading-8"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          “{comment || "تجربة ممتازة وخدمة مرتبة."}”
        </p>
      </div>

      <div className="mt-3 flex shrink-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-black text-gold">
          {getInitials(name)}
        </div>

        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-black">{name}</div>

          <div className="mt-0.5 text-[11px] text-white/55">
            {formatTimeAgo(review.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== بطاقة التجربة المميزة ================== */

function FeaturedReview({ review, visible, onPause, onResume }) {
  if (!review) {
    return null;
  }

  return (
    <article
      tabIndex={0}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      onTouchStart={onPause}
      className="relative h-[230px] self-start overflow-hidden rounded-[26px] border border-gold/20 bg-gradient-to-bl from-primary via-[#182231] to-[#0c1119] p-5 text-white shadow-xl outline-none focus:ring-2 focus:ring-gold/30 sm:h-[240px] sm:p-6"
    >
      <div className="pointer-events-none absolute -left-8 -top-12 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />

      <div className="pointer-events-none absolute bottom-2 left-4 opacity-[0.07]">
        <Quote className="h-16 w-16" />
      </div>

      <div
        className={`relative h-full transition-opacity ease-in-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transitionDuration: visible
            ? `${FEATURED_FADE_IN_DURATION}ms`
            : `${FEATURED_FADE_OUT_DURATION}ms`,
        }}
      >
        <FeaturedReviewContent review={review} />
      </div>
    </article>
  );
}

/* ================== بطاقة تقييم عادية ================== */

function ReviewCard({ review, expanded, onToggle, index }) {
  const name = getPublicName(
    review.customerName || review.userName || review.displayName,
  );

  const comment = String(review.comment || "").trim();
  const longComment = comment.length > 135;

  return (
    <article
      className="group rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gold/25 hover:shadow-lg"
      style={{
        transitionDelay: `${index * 40}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-primary to-gray-700 text-sm font-black text-gold shadow-sm">
            {getInitials(name)}
          </div>

          <div className="min-w-0 text-right">
            <div className="truncate font-black text-gray-900">{name}</div>

            <div className="mt-1 text-xs font-medium text-gray-400">
              {formatTimeAgo(review.createdAt)}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 px-2 py-1">
          <StarRow value={review.rating} readonly size={16} />
        </div>
      </div>

      {comment ? (
        <div className="mt-4 text-right">
          <p
            className="text-sm font-medium leading-7 text-gray-600"
            style={
              expanded
                ? undefined
                : {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
            }
          >
            {comment}
          </p>

          {longComment && (
            <button
              type="button"
              onClick={onToggle}
              className="mt-2 text-xs font-black text-amber-700 transition hover:text-amber-900 hover:underline"
            >
              {expanded ? "عرض أقل" : "قراءة التقييم كاملًا"}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 text-right text-sm italic text-gray-400">
          قيّم التجربة بدون إضافة تعليق.
        </p>
      )}
    </article>
  );
}

/* ================== القسم الرئيسي ================== */

export default function BarberRatingSection() {
  const sectionRef = useRef(null);
  const formRef = useRef(null);
  const listTopRef = useRef(null);

  const fadeTimeoutRef = useRef(null);
  const fadeAnimationFrameRef = useRef(null);

  const [sectionVisible, setSectionVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [summary, setSummary] = useState({
    count: 0,
    sum: 0,
    byStar: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  });

  const [reviews, setReviews] = useState([]);
  const [lastDocument, setLastDocument] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedList, setExpandedList] = useState(false);
  const [openReviewId, setOpenReviewId] = useState(null);

  const [featuredReviewIndex, setFeaturedReviewIndex] = useState(0);
  const [featuredVisible, setFeaturedVisible] = useState(true);
  const [featuredPaused, setFeaturedPaused] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const summaryReference = doc(
    db,
    "barbers",
    BARBER_ID,
    "meta",
    "reviewsSummary",
  );

  const reviewsCollection = collection(db, "barbers", BARBER_ID, "reviews");

  const count = Number(summary.count || 0);

  const average = count > 0 ? Number(summary.sum || 0) / count : 0;

  const featuredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const reviewRating = Number(review.rating || 0);
      const reviewComment = String(review.comment || "").trim();

      return reviewRating >= 4 && reviewComment.length >= 8;
    });
  }, [reviews]);

  const fallbackFeaturedReview = useMemo(() => {
    const reviewWithComment = reviews.find(
      (review) => String(review.comment || "").trim().length >= 8,
    );

    return reviewWithComment || reviews[0] || null;
  }, [reviews]);

  const currentFeaturedReview = useMemo(() => {
    if (featuredReviews.length === 0) {
      return fallbackFeaturedReview;
    }

    const safeIndex = featuredReviewIndex % featuredReviews.length;

    return featuredReviews[safeIndex];
  }, [featuredReviews, featuredReviewIndex, fallbackFeaturedReview]);

  /*
   * نثبت التقييم المستثنى من القائمة السفلية،
   * حتى لا تتغير أماكن البطاقات مع كل تقليب.
   */
  const fixedFeaturedReview = useMemo(() => {
    return featuredReviews[0] || fallbackFeaturedReview;
  }, [featuredReviews, fallbackFeaturedReview]);

  const regularReviews = useMemo(() => {
    if (!fixedFeaturedReview) {
      return reviews;
    }

    return reviews.filter((review) => review.id !== fixedFeaturedReview.id);
  }, [reviews, fixedFeaturedReview]);

  const visibleReviews = useMemo(() => {
    if (expandedList) {
      return regularReviews;
    }

    return regularReviews.slice(0, INITIAL_VISIBLE_REVIEWS);
  }, [expandedList, regularReviews]);

  function clearFeaturedFadeTimers() {
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    if (fadeAnimationFrameRef.current) {
      window.cancelAnimationFrame(fadeAnimationFrameRef.current);
      fadeAnimationFrameRef.current = null;
    }
  }

  /*
   * طبقة واحدة:
   * 1. إخفاء المحتوى الحالي.
   * 2. بعد اختفائه نغير التقييم.
   * 3. نظهر التقييم الجديد.
   */
  function moveToNextFeaturedReview() {
    if (featuredReviews.length <= 1) {
      return;
    }

    clearFeaturedFadeTimers();

    setFeaturedVisible(false);

    fadeTimeoutRef.current = window.setTimeout(() => {
      setFeaturedReviewIndex((currentIndex) => {
        return (currentIndex + 1) % featuredReviews.length;
      });

      fadeAnimationFrameRef.current = window.requestAnimationFrame(() => {
        fadeAnimationFrameRef.current = window.requestAnimationFrame(() => {
          setFeaturedVisible(true);
          fadeAnimationFrameRef.current = null;
        });
      });

      fadeTimeoutRef.current = null;
    }, FEATURED_FADE_OUT_DURATION);
  }

  useEffect(() => {
    clearFeaturedFadeTimers();
    setFeaturedReviewIndex(0);
    setFeaturedVisible(true);
  }, [featuredReviews.length]);

  useEffect(() => {
    if (featuredReviews.length <= 1 || featuredPaused) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      moveToNextFeaturedReview();
    }, FEATURED_CHANGE_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredReviews.length, featuredPaused]);

  useEffect(() => {
    return () => {
      clearFeaturedFadeTimers();
    };
  }, []);

  useEffect(() => {
    const element = sectionRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.13,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  async function loadSummary() {
    const snapshot = await getDoc(summaryReference);

    if (!snapshot.exists()) {
      setSummary({
        count: 0,
        sum: 0,
        byStar: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      });

      return;
    }

    setSummary(snapshot.data());
  }

  async function loadReviews({ reset = false } = {}) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      if (!reset && !lastDocument) {
        return;
      }

      const reviewsQuery = reset
        ? query(
            reviewsCollection,
            orderBy("createdAt", "desc"),
            limit(FEATURED_POOL_LIMIT),
          )
        : query(
            reviewsCollection,
            orderBy("createdAt", "desc"),
            startAfter(lastDocument),
            limit(PAGE_LIMIT),
          );

      const snapshot = await getDocs(reviewsQuery);

      const newReviews = snapshot.docs
        .map((documentSnapshot) => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data(),
        }))
        .filter(isActiveReview);

      setReviews((currentReviews) => {
        if (reset) {
          return newReviews;
        }

        const existingIds = new Set(currentReviews.map((review) => review.id));

        const uniqueReviews = newReviews.filter(
          (review) => !existingIds.has(review.id),
        );

        return [...currentReviews, ...uniqueReviews];
      });

      setLastDocument(snapshot.docs.at(-1) || null);

      const requestedLimit = reset ? FEATURED_POOL_LIMIT : PAGE_LIMIT;

      setHasMore(snapshot.docs.length === requestedLimit);

      if (reset) {
        setExpandedList(false);
        setOpenReviewId(null);
        setFeaturedReviewIndex(0);
        setFeaturedVisible(true);
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    async function loadRatingSection() {
      try {
        await Promise.all([
          loadSummary(),
          loadReviews({
            reset: true,
          }),
        ]);
      } catch (error) {
        console.error("Failed to load rating section:", error);

        setLoading(false);
      }
    }

    loadRatingSection();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openReviewForm() {
    setFormOpen(true);
    setFormError("");
    setSuccessMessage("");

    window.setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  }

  function closeReviewForm() {
    if (submitting) {
      return;
    }

    setFormOpen(false);
    setFormError("");
  }

  function validateForm() {
    if (!rating) {
      return "اختار عدد النجوم أولًا.";
    }

    if (!customerName.trim()) {
      return "اكتب اسمك.";
    }

    const normalizedPhone = toILPhoneE164(phone);

    if (!normalizedPhone || !isILPhoneE164(normalizedPhone)) {
      return "اكتب رقم هاتف صحيح يبدأ بـ 05.";
    }

    if (comment.trim().length > 500) {
      return "التعليق طويل جدًا، الحد الأقصى 500 حرف.";
    }

    return "";
  }

  async function submitReview() {
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const normalizedPhone = toILPhoneE164(phone);

    setSubmitting(true);
    setFormError("");

    try {
      await runTransaction(db, async (transaction) => {
        const summarySnapshot = await transaction.get(summaryReference);

        const currentSummary = summarySnapshot.exists()
          ? summarySnapshot.data()
          : {
              count: 0,
              sum: 0,
              byStar: {},
            };

        const newReviewReference = doc(reviewsCollection);

        transaction.set(newReviewReference, {
          rating,
          comment: comment.trim(),
          customerName: customerName.trim(),
          phoneKey: normalizedPhone,
          phonePrivate: true,
          status: "active",
          isNew: true,
          createdAt: serverTimestamp(),
        });

        transaction.set(
          summaryReference,
          {
            count: Number(currentSummary.count || 0) + 1,

            sum: Number(currentSummary.sum || 0) + rating,

            byStar: {
              ...currentSummary.byStar,

              [rating]: Number(currentSummary.byStar?.[rating] || 0) + 1,
            },

            updatedAt: serverTimestamp(),
          },
          {
            merge: true,
          },
        );
      });

      setRating(0);
      setCustomerName("");
      setPhone("");
      setComment("");
      setFormOpen(false);

      setSuccessMessage("شكرًا، تم إرسال تقييمك بنجاح.");

      await Promise.all([
        loadSummary(),
        loadReviews({
          reset: true,
        }),
      ]);

      window.setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error("Failed to submit review:", error);

      setFormError("تعذر إرسال التقييم الآن، حاول مرة ثانية.");
    } finally {
      setSubmitting(false);
    }
  }

  async function showMoreReviews() {
    if (!expandedList) {
      setExpandedList(true);
      return;
    }

    if (hasMore) {
      await loadReviews();
    }
  }

  function showLessReviews() {
    setOpenReviewId(null);

    listTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      setExpandedList(false);
    }, 180);
  }

  return (
    <section
      ref={sectionRef}
      id="ratings"
      dir="rtl"
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#fffdfa] to-[#faf7f1] px-4 py-16 font-body sm:py-20"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

        <div className="absolute -left-24 bottom-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <div className="absolute right-[12%] top-24 h-2 w-2 rounded-full bg-gold/50" />

        <div className="absolute left-[18%] top-40 h-1.5 w-1.5 rounded-full bg-gold/40" />
      </div>

      <div
        className={`relative mx-auto max-w-5xl transition-all duration-700 ${
          sectionVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
      >
        <div className="text-center">
          <SectionTitle
            icon={
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/20">
                <MessageSquare className="h-5 w-5 text-gold" />
              </div>
            }
          >
            تقييمات وتجربة الزبائن
          </SectionTitle>

          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-gray-500 sm:text-base">
            رضا الزبون هو أهم جزء من شغلنا، وهذه بعض التجارب الحقيقية لزبائن
            المحل.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[0.78fr_1.5fr]">
          <div className="h-fit rounded-[26px] border border-gold/15 bg-white p-5 shadow-lg shadow-black/5 sm:p-6">
            <div className="text-center">
              <div className="text-sm font-black text-gray-500">
                معدل رضا الزبائن
              </div>

              <div className="mt-1 flex items-end justify-center gap-2">
                <div className="text-5xl font-black tracking-tight text-primary sm:text-6xl">
                  {count ? average.toFixed(1) : "—"}
                </div>

                <div className="pb-1.5 text-base font-black text-gray-400">
                  / 5
                </div>
              </div>

              <div className="mt-2">
                <StarRow value={average} readonly size={23} />
              </div>

              <div className="mt-1 text-xs font-bold text-gray-500 sm:text-sm">
                {count ? `بناءً على ${count} تقييم` : "لا يوجد تقييمات بعد"}
              </div>
            </div>

            <RatingBars byStar={summary.byStar} total={count} />
          </div>

          {loading ? (
            <div className="flex h-[230px] items-center justify-center rounded-[26px] border border-gray-100 bg-white p-5 text-sm font-bold text-gray-500 shadow-sm sm:h-[240px]">
              جارٍ تحميل تجربة الزبائن...
            </div>
          ) : currentFeaturedReview ? (
            <FeaturedReview
              review={currentFeaturedReview}
              visible={featuredVisible}
              onPause={() => setFeaturedPaused(true)}
              onResume={() => setFeaturedPaused(false)}
            />
          ) : (
            <div className="flex h-[230px] flex-col items-center justify-center rounded-[26px] border border-dashed border-gold/30 bg-white p-6 text-center shadow-sm sm:h-[240px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-xl text-gold">
                ★
              </div>

              <h3 className="mt-3 text-lg font-black text-gray-900">
                كن أول من يشارك تجربته
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
                رأيك يساعدنا نحافظ على أفضل خدمة ونطور تجربة الزبائن.
              </p>

              <button
                type="button"
                onClick={openReviewForm}
                className="mt-4 rounded-2xl bg-gold px-5 py-2.5 font-black text-primary shadow-md transition hover:-translate-y-0.5 hover:brightness-95"
              >
                أضف أول تقييم
              </button>
            </div>
          )}
        </div>

        {successMessage && (
          <div className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />

            {successMessage}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-5 border-b border-gray-200/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 text-xs font-black text-amber-700">
              <Sparkles className="h-4 w-4" />
              آراء حقيقية
            </div>

            <h3 className="mt-2 text-2xl font-black text-gray-900">
              ماذا قال زبائننا؟
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              أحدث التجارب والتقييمات من زبائن المحل.
            </p>
          </div>

          <button
            type="button"
            onClick={openReviewForm}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-black text-white shadow-lg shadow-primary/15 transition duration-300 hover:-translate-y-1 hover:bg-gray-900 hover:shadow-xl sm:w-auto"
          >
            <MessageSquare className="h-5 w-5 text-gold transition group-hover:scale-110" />
            شاركنا تجربتك
          </button>
        </div>

        {formOpen && (
          <div
            ref={formRef}
            className="mx-auto mt-7 max-w-2xl rounded-[28px] border border-gold/20 bg-white p-5 shadow-xl shadow-black/5 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-right">
                <h3 className="text-xl font-black text-gray-900">
                  كيف كانت تجربتك؟
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  اختار النجوم وبعدها أكمل البيانات البسيطة.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewForm}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="إغلاق نموذج التقييم"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
              <StarRow value={rating} onChange={setRating} size={38} />

              <div className="mt-3 text-center text-sm font-black text-gray-700">
                {rating ? `${rating} من 5` : "اضغط على عدد النجوم"}
              </div>
            </div>

            {rating > 0 && (
              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-right text-sm font-black text-gray-700">
                    الاسم
                  </label>

                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="اكتب اسمك"
                    maxLength={60}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-right outline-none transition focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-right text-sm font-black text-gray-700">
                    رقم الهاتف
                  </label>

                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-right outline-none transition focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20"
                  />

                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-500">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    رقم الهاتف للتحقق فقط ولن يظهر للزبائن.
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-right text-sm font-black text-gray-700">
                      تعليقك
                    </label>

                    <span className="text-xs text-gray-400">اختياري</span>
                  </div>

                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="احكيلنا عن تجربتك..."
                    maxLength={500}
                    className="min-h-[115px] w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-right leading-7 outline-none transition focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20"
                  />

                  <div className="mt-1 text-left text-xs font-medium text-gray-400">
                    {comment.length}/500
                  </div>
                </div>

                {formError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                    {formError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting}
                  className="w-full rounded-2xl bg-gold py-3.5 font-black text-primary shadow-md transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "جارٍ إرسال التقييم..." : "إرسال التقييم"}
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={listTopRef} className="scroll-mt-24" />

        {loading ? (
          <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-8 text-center text-sm font-bold text-gray-500 shadow-sm">
            جارٍ تحميل التقييمات...
          </div>
        ) : visibleReviews.length === 0 && currentFeaturedReview ? (
          <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-white p-7 text-center text-sm font-medium text-gray-500">
            سيتم عرض المزيد من تجارب الزبائن هنا.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {visibleReviews.map((review, index) => (
              <ReviewCard
                key={review.id}
                review={review}
                index={index}
                expanded={openReviewId === review.id}
                onToggle={() => {
                  setOpenReviewId((currentId) =>
                    currentId === review.id ? null : review.id,
                  );
                }}
              />
            ))}
          </div>
        )}

        {!loading && regularReviews.length > 0 && (
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {!expandedList && (
              <button
                type="button"
                onClick={showMoreReviews}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-primary bg-white px-7 py-3.5 font-black text-primary shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-lg sm:w-auto"
              >
                عرض كل التقييمات
                <ArrowDown className="h-5 w-5 transition duration-300 group-hover:translate-y-1" />
              </button>
            )}

            {expandedList && hasMore && (
              <button
                type="button"
                onClick={showMoreReviews}
                disabled={loadingMore}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-primary bg-white px-7 py-3.5 font-black text-primary shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {loadingMore
                  ? "جارٍ تحميل التقييمات..."
                  : "تحميل تقييمات إضافية"}

                {!loadingMore && (
                  <ArrowDown className="h-5 w-5 transition duration-300 group-hover:translate-y-1" />
                )}
              </button>
            )}

            {expandedList && (
              <button
                type="button"
                onClick={showLessReviews}
                className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-3.5 font-black text-gray-600 transition hover:bg-gray-100 sm:w-auto"
              >
                عرض أقل
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
