// src/pages/barberPanel/reviews/ReviewsManagerPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import TabsBar from "./TabsBar";
import SummaryCards from "./SummaryCards";
import FiltersBar from "./FiltersBar";
import ReviewsList from "./ReviewsList";
import BlockedPhonesPanel from "./BlockedPhonesPanel";
import ArchivedPanel from "./ArchivedPanel";
import UndoToast from "./UndoToast";

import { useReviewsManager } from "./useReviewsManager";

export default function ReviewsManagerPage() {
  const navigate = useNavigate();

  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const {
    tab,
    setTab,

    // البيانات
    filteredReviews,
    archived,
    blocked,
    summary,
    count,
    avg,

    // التحميل
    loadingReviews,
    loadingArchived,
    loadingBlocked,
    loadingSummary,

    // تحميل المزيد
    hasMore,

    // الفلاتر
    qText,
    setQText,
    stars,
    setStars,
    sortBy,
    setSortBy,

    // العمليات
    fetchReviews,
    fetchArchived,
    fetchBlocked,
    fetchSummary,
    archiveReview,
    restoreReview,
    deleteArchivedPermanently,
    blockPhoneEverywhere,
    unblockPhoneEverywhere,

    // التراجع
    undo,
    setUndo,
    undoArchive,
  } = useReviewsManager();

  const counts = useMemo(
    () => ({
      reviews: filteredReviews?.length || 0,
      blocked: blocked?.length || 0,
      archived: archived?.length || 0,
    }),
    [filteredReviews, blocked, archived],
  );

  const blockedSet = useMemo(() => {
    const result = new Set();

    (blocked || []).forEach((item) => {
      const phoneKey = String(item.phoneKey || item.id || "").trim();

      if (phoneKey) {
        result.add(phoneKey);
      }
    });

    return result;
  }, [blocked]);

  const newReviewsCount = useMemo(() => {
    return (filteredReviews || []).filter((review) => review.isNew === true)
      .length;
  }, [filteredReviews]);

  const lowRatingsCount = useMemo(() => {
    return (filteredReviews || []).filter((review) => {
      const rating = Number(review.rating ?? review.stars ?? 0);

      return rating > 0 && rating <= 2;
    }).length;
  }, [filteredReviews]);

  const anyLoading =
    loadingReviews ||
    loadingBlocked ||
    loadingArchived ||
    loadingSummary ||
    refreshing;

  async function onRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setMessage("");

    try {
      await Promise.all([
        fetchReviews({ reset: true }),
        fetchBlocked(),
        fetchArchived(),
        fetchSummary(),
      ]);

      setMessage("تم تحديث البيانات بنجاح.");

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to refresh reviews manager:", error);

      setMessage("تعذر تحديث البيانات. حاول مرة ثانية.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleArchive(reviewId) {
    try {
      await archiveReview(reviewId);
    } catch (error) {
      console.error("Failed to archive review:", error);

      setMessage("تعذر أرشفة التقييم. حاول مرة ثانية.");
    }
  }

  async function handleRestore(reviewId) {
    try {
      await restoreReview(reviewId);

      setMessage("تم استرجاع التقييم.");

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to restore review:", error);

      setMessage("تعذر استرجاع التقييم. حاول مرة ثانية.");
    }
  }

  async function handleDeleteForever(reviewId) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا التقييم نهائيًا؟ لا يمكن التراجع بعد الحذف.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteArchivedPermanently(reviewId);

      setMessage("تم حذف التقييم نهائيًا.");

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to delete archived review:", error);

      setMessage("تعذر حذف التقييم. حاول مرة ثانية.");
    }
  }

  async function handleBlock(phoneKey, reviewId) {
    const confirmed = window.confirm(
      "هل تريد حظر هذا الرقم؟ لن يتمكن صاحبه من إرسال تقييمات أو حجوزات جديدة.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await blockPhoneEverywhere(phoneKey, reviewId);

      setMessage("تم حظر الرقم بنجاح.");

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to block phone:", error);

      setMessage("تعذر حظر الرقم. حاول مرة ثانية.");
    }
  }

  async function handleUnblock(phoneKey) {
    const confirmed = window.confirm("هل تريد إلغاء حظر هذا الرقم؟");

    if (!confirmed) {
      return;
    }

    try {
      await unblockPhoneEverywhere(phoneKey);

      setMessage("تم إلغاء حظر الرقم.");

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to unblock phone:", error);

      setMessage("تعذر إلغاء الحظر. حاول مرة ثانية.");
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-100 px-3 sm:px-4"
      style={{
        paddingTop: "calc(var(--header-h, 96px) + 16px)",
        paddingBottom: "32px",
      }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
          {/* أعلى الصفحة */}
          <div className="border-b border-gray-100 bg-gradient-to-l from-white to-amber-50/60 p-5 md:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-right">
                <h1 className="text-2xl font-black text-gray-900 md:text-3xl">
                  إدارة التقييمات
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  راقب آراء الزبائن، أخفِ التقييمات غير المناسبة وأدر الأرقام
                  المحظورة بسهولة.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={anyLoading}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? "جارٍ التحديث..." : "تحديث"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800"
                >
                  رجوع
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-7">
            {message && (
              <div
                className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-bold ${
                  message.includes("تعذر")
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </div>
            )}

            {/* إحصائيات سريعة */}
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-bold text-gray-500">
                  كل التقييمات
                </div>

                <div className="mt-1 text-2xl font-black text-gray-900">
                  {count || 0}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-bold text-amber-700">
                  المعدل العام
                </div>

                <div className="mt-1 text-2xl font-black text-amber-800">
                  {count ? Number(avg || 0).toFixed(1) : "—"}
                  <span className="mr-1 text-base">★</span>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-xs font-bold text-blue-700">
                  تقييمات جديدة
                </div>

                <div className="mt-1 text-2xl font-black text-blue-800">
                  {newReviewsCount}
                </div>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="text-xs font-bold text-red-700">
                  تقييمات منخفضة
                </div>

                <div className="mt-1 text-2xl font-black text-red-800">
                  {lowRatingsCount}
                </div>
              </div>
            </div>

            {/* التبويبات */}
            <div className="mb-5">
              <TabsBar tab={tab} setTab={setTab} counts={counts} />
            </div>

            {/* التقييمات */}
            {tab === "reviews" && (
              <>
                <div className="mb-4">
                  <SummaryCards
                    count={count}
                    avg={avg}
                    byStar={summary?.byStar}
                  />
                </div>

                <div className="mb-4">
                  <FiltersBar
                    qText={qText}
                    setQText={setQText}
                    stars={stars}
                    setStars={setStars}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    onRefresh={onRefresh}
                    loading={anyLoading}
                  />
                </div>

                {newReviewsCount > 0 && (
                  <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                    يوجد {newReviewsCount} تقييم جديد يحتاج مراجعة.
                  </div>
                )}

                <ReviewsList
                  items={filteredReviews}
                  loading={loadingReviews}
                  hasMore={hasMore}
                  onLoadMore={() => fetchReviews({ reset: false })}
                  blockedSet={blockedSet}
                  onArchive={handleArchive}
                  onBlock={handleBlock}
                  onUnblock={handleUnblock}
                />
              </>
            )}

            {/* الأرقام المحظورة */}
            {tab === "blocked" && (
              <BlockedPhonesPanel
                blocked={blocked}
                loading={loadingBlocked}
                onUnblock={handleUnblock}
              />
            )}

            {/* الأرشيف */}
            {tab === "archived" && (
              <ArchivedPanel
                items={archived}
                loading={loadingArchived}
                onRestore={handleRestore}
                onDeleteForever={handleDeleteForever}
              />
            )}
          </div>
        </div>
      </div>

      <UndoToast
        undo={undo}
        onUndo={undoArchive}
        onClose={() => setUndo(null)}
      />
    </div>
  );
}
