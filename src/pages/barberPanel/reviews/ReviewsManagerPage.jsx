// src/pages/barberPanel/reviews/ReviewsManagerPage.jsx
import TabsBar from "./TabsBar";
import SummaryCards from "./SummaryCards";
import FiltersBar from "./FiltersBar";
import ReviewsList from "./ReviewsList";
import BlockedPhonesPanel from "./BlockedPhonesPanel";
import ArchivedPanel from "./ArchivedPanel";
import UndoToast from "./UndoToast";

import { useMemo } from "react";
import { useReviewsManager } from "./useReviewsManager";
import { useNavigate } from "react-router-dom";

export default function ReviewsManagerPage() {
  const navigate = useNavigate();

  const {
    tab,
    setTab,

    // data
    filteredReviews,
    archived,
    blocked,
    summary,
    count,
    avg,

    // loading
    loadingReviews,
    loadingArchived,
    loadingBlocked,
    loadingSummary,

    // pagination
    hasMore,

    // filters
    qText,
    setQText,
    stars,
    setStars,
    sortBy,
    setSortBy,

    // actions
    fetchReviews,
    fetchArchived,
    fetchBlocked,
    fetchSummary,
    archiveReview,
    restoreReview,
    deleteArchivedPermanently,
    blockPhoneEverywhere,
    unblockPhoneEverywhere,

    // undo
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
    const s = new Set();
    (blocked || []).forEach((b) => {
      const key = String(b.phoneKey || b.id || "");
      if (key) s.add(key);
    });
    return s;
  }, [blocked]);

  const onRefresh = async () => {
    await Promise.all([
      fetchReviews({ reset: true }),
      fetchBlocked(),
      fetchArchived(),
      fetchSummary(),
    ]);
  };

  const anyLoading =
    loadingReviews || loadingBlocked || loadingArchived || loadingSummary;

  return (
    <div
      className="min-h-screen bg-gray-100 px-4"
      dir="rtl"
      style={{
        paddingTop: "calc(var(--header-h, 96px) + 16px)",
        paddingBottom: "24px",
      }}
    >
      <div className="w-full max-w-4xl mx-auto">
        {/* Card */}
        <div className="bg-white shadow-xl rounded-2xl border border-gray-200 p-5 md:p-8">
          {/* Title + Back */}
          <div className="flex flex-row-reverse items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-800 transition"
              aria-label="رجوع"
              title="رجوع"
            >
              <span className="text-lg">←</span> الرجوع
            </button>

            <div className="text-right">
              <div className="text-2xl font-black text-gray-900">
                إدارة التقييمات
              </div>
              <div className="text-sm text-gray-500 mt-1">
                أرشف تقييمات، احظر/فك حظر أرقام، وراجع الأرشيف — بشكل منظم
                وواضح.
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-3">
            <TabsBar tab={tab} setTab={setTab} counts={counts} />
          </div>

          {/* Summary (بس بالتقييمات) */}
          {tab === "reviews" ? (
            <div className="mb-3">
              <SummaryCards count={count} avg={avg} byStar={summary?.byStar} />
            </div>
          ) : null}

          {/* Content */}
          {tab === "reviews" ? (
            <>
              <div className="mb-3">
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

              <ReviewsList
                items={filteredReviews}
                loading={loadingReviews}
                hasMore={hasMore}
                onLoadMore={() => fetchReviews({ reset: false })}
                blockedSet={blockedSet}
                onArchive={archiveReview}
                onBlock={blockPhoneEverywhere}
                onUnblock={unblockPhoneEverywhere}
              />
            </>
          ) : null}

          {tab === "blocked" ? (
            <BlockedPhonesPanel
              blocked={blocked}
              loading={loadingBlocked}
              onUnblock={unblockPhoneEverywhere}
            />
          ) : null}

          {tab === "archived" ? (
            <ArchivedPanel
              items={archived}
              loading={loadingArchived}
              onRestore={restoreReview}
              onDeleteForever={deleteArchivedPermanently}
            />
          ) : null}
        </div>
      </div>

      {/* Undo Toast */}
      <UndoToast
        undo={undo}
        onUndo={undoArchive}
        onClose={() => setUndo(null)}
      />
    </div>
  );
}
