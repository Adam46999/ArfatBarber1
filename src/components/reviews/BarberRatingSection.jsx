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
  where,
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
    <div className="relative flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-black text-gold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          آخر تجربة مكتوبة
        </div>

        <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-1.5">
          <StarRow value={review.rating} readonly size={17} />
        </div>
      </div>

      <div className="mt-5 text-right">
        <Quote
          className="mb-2 h-5 w-5 text-gold/80"
          aria-hidden="true"
        />

        <p className="break-words text-[15px] font-bold leading-7 text-white/95 sm:text-base sm:leading-8">
          “{comment}”
        </p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-white/10 text-xs font-black text-gold shadow-inner">
            {getInitials(name)}
          </div>

          <div className="min-w-0 text-right">
            <div className="truncate text-sm font-black text-white">
              {name}
            </div>

            <div className="mt-0.5 text-xs font-medium text-white/55">
              {formatTimeAgo(review.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== بطاقة التجربة المميزة ================== */

function FeaturedReview({ review }) {
  if (!review) {
    return null;
  }

  return (
    <article className="relative self-start overflow-hidden rounded-[22px] border border-gold/20 bg-[linear-gradient(145deg,#17202d_0%,#101722_100%)] p-5 text-white shadow-[0_16px_38px_rgba(15,23,42,0.16)] sm:p-6">
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-gold/[0.07] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
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
      className="group rounded-[20px] border border-[#e9e2d3] bg-[linear-gradient(180deg,#ffffff_0%,#fffdf9_100%)] p-4 shadow-[0_8px_24px_rgba(35,30,20,0.055)] transition duration-300 sm:p-5 md:hover:-translate-y-0.5 md:hover:border-gold/30 md:hover:shadow-lg"
      style={{
        transitionDelay: `${index * 40}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-primary to-slate-700 text-sm font-black text-gold shadow-sm sm:h-11 sm:w-11">
            {getInitials(name)}
          </div>

          <div className="min-w-0 text-right">
            <div className="truncate font-black text-gray-900">{name}</div>

            <div className="mt-1 text-xs font-medium text-gray-400">
              {formatTimeAgo(review.createdAt)}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-2 py-1">
          <StarRow value={review.rating} readonly size={16} />
        </div>
      </div>

      {comment ? (
        <div className="mt-4 text-right">
          <p
            className="text-sm font-medium leading-6 text-slate-600 sm:leading-7"
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
              className="mt-2 inline-flex min-h-10 items-center text-xs font-black text-amber-700 transition hover:text-amber-900 hover:underline"
            >
              {expanded ? "عرض أقل" : "قراءة التقييم كاملًا"}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 text-right text-sm italic text-gray-400">
          اكتفى الزبون بالتقييم بالنجوم.
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

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [verifiedBooking, setVerifiedBooking] = useState(null);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
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

      const reviewComment = String(review.comment || "").trim();

      return reviewComment.length >= 8;
    });
  }, [reviews]);

  const fixedFeaturedReview = useMemo(() => {
    return featuredReviews[0] || null;
  }, [featuredReviews]);

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
    if (submitting || verifyingPhone) {
      return;
    }

    setFormOpen(false);
    setVerifiedBooking(null);
    setRating(0);
    setPhone("");
    setComment("");
    setFormError("");
  }
  function getIsraelNowKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  }

  function getReviewBookingTimeKey(booking) {
    const date = String(booking?.selectedDate || "").trim();
    const time = String(booking?.selectedTime || "").trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time)
    ) {
      return "";
    }

    return `${date}T${time}`;
  }

  function getReviewErrorMessage(error) {
    const code = String(error?.message || "");

    if (code.includes("REVIEW_INVALID_PHONE")) {
      return "اكتب رقم الهاتف المستخدم وقت الحجز.";
    }

    if (code.includes("REVIEW_PHONE_BLOCKED")) {
      return "تعذر متابعة التقييم بهذا الرقم.";
    }

    if (code.includes("REVIEW_NO_PAST_BOOKING")) {
      return "ما لقينا حجز سابق بهذا الرقم. تأكد من الرقم المستخدم وقت الحجز.";
    }

    if (
      code.includes("REVIEW_ALREADY_SUBMITTED") ||
      code.includes("REVIEW_BOOKING_ALREADY_USED")
    ) {
      return "تم تقييم آخر حجز سابق بهذا الرقم. بعد موعد جديد رح تقدر تضيف تقييم جديد.";
    }

    return "تعذر إكمال العملية الآن، حاول مرة ثانية.";
  }

  async function resolveReviewBooking(inputPhone) {
    const normalizedPhone = toILPhoneE164(inputPhone);

    if (!normalizedPhone || !isILPhoneE164(normalizedPhone)) {
      throw new Error("REVIEW_INVALID_PHONE");
    }

    const localPhone = normalizedPhone.startsWith("+972")
      ? `0${normalizedPhone.slice(4)}`
      : String(inputPhone || "").replace(/\D/g, "");

    const [globalBlockedSnapshot, reviewBlockedSnapshot] =
      await Promise.all([
        getDoc(doc(db, "blockedPhones", normalizedPhone)),
        getDoc(
          doc(
            db,
            "barbers",
            BARBER_ID,
            "blockedPhones",
            normalizedPhone,
          ),
        ),
      ]);

    if (
      globalBlockedSnapshot.exists() ||
      reviewBlockedSnapshot.exists()
    ) {
      throw new Error("REVIEW_PHONE_BLOCKED");
    }

    const [e164Snapshot, localSnapshot] = await Promise.all([
      getDocs(
        query(
          collection(db, "bookings"),
          where("phoneNumber", "==", normalizedPhone),
        ),
      ),
      getDocs(
        query(
          collection(db, "bookings"),
          where("phoneNumber", "==", localPhone),
        ),
      ),
    ]);

    const bookingsById = new Map();

    for (const snapshot of [e164Snapshot, localSnapshot]) {
      snapshot.forEach((bookingDocument) => {
        bookingsById.set(bookingDocument.id, {
          id: bookingDocument.id,
          ...bookingDocument.data(),
        });
      });
    }

    const nowKey = getIsraelNowKey();

    const pastBookings = [...bookingsById.values()]
      .map((booking) => ({
        ...booking,
        reviewTimeKey: getReviewBookingTimeKey(booking),
      }))
      .filter(
        (booking) =>
          !booking.cancelledAt &&
          booking.reviewTimeKey &&
          booking.reviewTimeKey < nowKey,
      )
      .sort((a, b) =>
        b.reviewTimeKey.localeCompare(a.reviewTimeKey),
      );

    if (pastBookings.length === 0) {
      throw new Error("REVIEW_NO_PAST_BOOKING");
    }

    const latestBooking = pastBookings[0];

    const reviewReference = doc(
      reviewsCollection,
      `booking_${latestBooking.id}`,
    );

    const existingReviewSnapshot =
      await getDoc(reviewReference);

    if (existingReviewSnapshot.exists()) {
      throw new Error("REVIEW_ALREADY_SUBMITTED");
    }

    return {
      booking: latestBooking,
      normalizedPhone,
      reviewReference,
    };
  }

  async function verifyReviewPhone() {
    if (verifyingPhone || submitting) {
      return;
    }

    setVerifyingPhone(true);
    setFormError("");

    try {
      const { booking } = await resolveReviewBooking(phone);

      setVerifiedBooking(booking);
      setRating(0);
      setComment("");
    } catch (error) {
      setVerifiedBooking(null);
      setFormError(getReviewErrorMessage(error));
    } finally {
      setVerifyingPhone(false);
    }
  }

  function changeReviewPhone() {
    if (submitting) {
      return;
    }

    setVerifiedBooking(null);
    setRating(0);
    setComment("");
    setFormError("");
  }

  function validateForm() {
    if (!verifiedBooking) {
      return "أكد رقم الهاتف أولًا.";
    }

    if (!rating) {
      return "اختار عدد النجوم أولًا.";
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

    setSubmitting(true);
    setFormError("");

    try {
      const {
        booking,
        normalizedPhone,
        reviewReference,
      } = await resolveReviewBooking(phone);

      const customerName = String(
        booking.fullName ||
          booking.customerName ||
          "زبون",
      )
        .trim()
        .slice(0, 60) || "زبون";

      await runTransaction(db, async (transaction) => {
        const reviewSnapshot =
          await transaction.get(reviewReference);

        if (reviewSnapshot.exists()) {
          throw new Error("REVIEW_BOOKING_ALREADY_USED");
        }

        const summarySnapshot =
          await transaction.get(summaryReference);

        const currentSummary = summarySnapshot.exists()
          ? summarySnapshot.data()
          : {
              count: 0,
              sum: 0,
              byStar: {},
            };

        transaction.set(reviewReference, {
          rating,
          comment: comment.trim(),
          customerName,
          phoneKey: normalizedPhone,
          phonePrivate: true,
          bookingId: booking.id,
          bookingLinked: true,
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
              ...(currentSummary.byStar || {}),
              [rating]:
                Number(
                  currentSummary.byStar?.[rating] || 0,
                ) + 1,
            },
            updatedAt: serverTimestamp(),
          },
          {
            merge: true,
          },
        );
      });

      setRating(0);
      setPhone("");
      setComment("");
      setVerifiedBooking(null);
      setFormOpen(false);

      setSuccessMessage("شكرًا، وصلنا تقييمك.");

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

      const message = getReviewErrorMessage(error);

      if (
        message.includes("آخر حجز") ||
        message.includes("ما لقينا") ||
        message.includes("تعذر متابعة")
      ) {
        setVerifiedBooking(null);
      }

      setFormError(message);
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
      className="relative overflow-hidden bg-gradient-to-b from-[#fffefa] via-[#fffdf8] to-[#f8f5ee] px-3 py-12 font-body sm:px-4 sm:py-16"
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
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#dfc982] bg-[#fff6d8] text-[#8a6717] shadow-[0_5px_14px_rgba(128,94,22,0.09)]">
                <MessageSquare className="h-5 w-5 text-gold" />
              </div>
            }
          >
            تقييمات الزبائن
          </SectionTitle>

          <p className="mx-auto mt-2.5 max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
            اطّلع على تقييمات وتجارب زبائن المحل وخذ فكرة أوضح عن التجربة قبل موعدك.
          </p>
        </div>

        <div className="mt-6 grid items-start gap-4 sm:mt-7 sm:gap-5 lg:grid-cols-[0.82fr_1.5fr]">
          <div className="h-fit rounded-[22px] border border-[#e4d7b6] bg-[linear-gradient(180deg,#fffdf7_0%,#ffffff_100%)] p-4 shadow-[0_14px_34px_rgba(40,32,20,0.07)] ring-1 ring-white/80 sm:p-5">
            <div className="text-center">
              <div className="text-sm font-black text-gray-500">
                تقييم الزبائن
              </div>

              <div className="mt-1 flex items-end justify-center gap-2">
                <div className="text-5xl font-black tracking-[-0.04em] text-slate-900 sm:text-6xl">
                  {count ? average.toFixed(1) : "—"}
                </div>

                <div className="pb-1.5 text-base font-black text-gray-400">
                  / 5
                </div>
              </div>

              <div className="mt-2">
                <StarRow value={average} readonly size={23} />
              </div>

              <div className="mt-1.5 text-xs font-bold text-slate-500 sm:text-sm">
                {count ? `بناءً على ${count} تقييم` : "لا يوجد تقييمات بعد"}
              </div>
            </div>

            <RatingBars byStar={summary.byStar} total={count} />
          </div>

          {loading ? (
            <div className="flex h-[230px] items-center justify-center rounded-[26px] border border-gray-100 bg-white p-5 text-sm font-bold text-gray-500 shadow-sm sm:h-[240px]">
              جارٍ تحميل تجربة الزبائن...
            </div>
          ) : fixedFeaturedReview ? (
            <FeaturedReview review={fixedFeaturedReview} />
          ) : (
            <div className="flex h-[230px] flex-col items-center justify-center rounded-[26px] border border-dashed border-gold/30 bg-white p-6 text-center shadow-sm sm:h-[240px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-xl text-gold">
                ★
              </div>

              <h3 className="mt-3 text-lg font-black text-gray-900">
                لا توجد تجربة مكتوبة بعد
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
                عندما يضيف أحد الزبائن تعليقًا على تجربته سيظهر هنا.
              </p>
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
<h3 className="mt-2 text-2xl font-black text-gray-900">
              تجارب الزبائن
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              اقرأ أحدث التقييمات والتجارب وخذ فكرة أوضح قبل حجز موعدك.
            </p>
          </div>

          <button
            type="button"
            onClick={openReviewForm}
            className="group flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-black text-white shadow-lg shadow-primary/15 transition duration-300 active:scale-[0.99] sm:w-auto md:hover:-translate-y-0.5 md:hover:bg-gray-900 md:hover:shadow-xl"
          >
            <MessageSquare className="h-5 w-5 text-gold transition group-hover:scale-110" />
            قيّم تجربتك
          </button>
        </div>

        {formOpen && (
          <div
            ref={formRef}
            className="mx-auto mt-6 max-w-xl rounded-[22px] border border-[#e4d7b6] bg-white p-4 shadow-[0_16px_38px_rgba(35,30,20,0.08)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 text-right">
                <h3 className="text-xl font-black text-slate-900">
                  قيّم تجربتك
                </h3>

                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  {verifiedBooking
                    ? "اختار عدد النجوم، وإذا بتحب أضف تعليقًا قصيرًا."
                    : "أدخل رقم الهاتف الذي استخدمته وقت الحجز."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewForm}
                disabled={submitting || verifyingPhone}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="إغلاق نموذج التقييم"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!verifiedBooking ? (
              <div className="mt-5">
                <label
                  htmlFor="review-phone"
                  className="mb-2 block text-right text-sm font-black text-slate-700"
                >
                  رقم الهاتف
                </label>

                <input
                  id="review-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  dir="ltr"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setFormError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void verifyReviewPhone();
                    }
                  }}
                  placeholder="05XXXXXXXX"
                  className="min-h-[52px] w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 text-left text-base font-semibold outline-none transition focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20"
                  aria-describedby="review-phone-help"
                />

                <div
                  id="review-phone-help"
                  className="mt-2.5 flex items-start gap-2 text-right text-xs font-medium leading-5 text-slate-500"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    بنستخدم الرقم فقط للتأكد من وجود حجز سابق، ولن يظهر في التقييم.
                  </span>
                </div>

                {formError && (
                  <div
                    className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-bold leading-6 text-red-700"
                    role="alert"
                  >
                    {formError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={verifyReviewPhone}
                  disabled={verifyingPhone}
                  className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-primary px-5 font-black text-white shadow-md transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:hover:bg-gray-900"
                >
                  {verifyingPhone
                    ? "جارٍ التحقق..."
                    : "متابعة"}
                </button>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5 text-right">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

                    <div>
                      <div className="text-sm font-black text-emerald-800">
                        تم العثور على حجز سابق
                      </div>

                      <div className="mt-0.5 text-xs font-medium text-emerald-700/80">
                        رقم الهاتف لن يظهر بالتقييم.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={changeReviewPhone}
                    disabled={submitting}
                    className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    تغيير الرقم
                  </button>
                </div>

                <div className="rounded-[20px] border border-amber-100 bg-amber-50/60 p-4 sm:p-5">
                  <div className="text-center text-sm font-black text-slate-700">
                    كيف كانت تجربتك؟
                  </div>

                  <div className="mt-3">
                    <StarRow
                      value={rating}
                      onChange={setRating}
                      size={38}
                    />
                  </div>

                  <div className="mt-2 text-center text-sm font-black text-slate-600">
                    {rating
                      ? `${rating} من 5`
                      : "اختار عدد النجوم"}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="review-comment"
                      className="text-right text-sm font-black text-slate-700"
                    >
                      تعليقك
                    </label>

                    <span className="text-xs font-medium text-gray-400">
                      اختياري
                    </span>
                  </div>

                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                      setFormError("");
                    }}
                    placeholder="احكيلنا عن تجربتك..."
                    maxLength={500}
                    className="min-h-[105px] w-full resize-y rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-right leading-7 outline-none transition focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20"
                  />

                  <div className="mt-1.5 flex items-center justify-between gap-3 text-xs font-medium text-gray-400">
                    <span className="text-right">
                      اسمك سيظهر بشكل مختصر حفاظًا على الخصوصية.
                    </span>

                    <span dir="ltr">
                      {comment.length}/500
                    </span>
                  </div>
                </div>

                {formError && (
                  <div
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm font-bold leading-6 text-red-700"
                    role="alert"
                  >
                    {formError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting || !rating}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gold px-5 font-black text-primary shadow-md transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 md:hover:brightness-95"
                >
                  {submitting
                    ? "جارٍ إرسال التقييم..."
                    : "إرسال التقييم"}
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
        ) : visibleReviews.length === 0 && fixedFeaturedReview ? (
          <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-white p-7 text-center text-sm font-medium text-gray-500">
            لا توجد تقييمات إضافية حاليًا.
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
