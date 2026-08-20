import { useMemo, useState } from "react";

import TabsBar from "./TabsBar";
import FiltersBar from "./FiltersBar";
import ReviewsList from "./ReviewsList";
import BlockedPhonesPanel from "./BlockedPhonesPanel";
import ArchivedPanel from "./ArchivedPanel";
import UndoToast from "./UndoToast";

import { useReviewsManager } from "./useReviewsManager";

export default function ReviewsManagerPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const {
    tab,
    setTab,

    filteredReviews,
    archived,
    blocked,
    count,
    avg,

    loadingReviews,
    loadingArchived,
    loadingBlocked,
    loadingSummary,

    hasMore,

    qText,
    setQText,
    stars,
    setStars,
    sortBy,
    setSortBy,

    fetchReviews,
    fetchArchived,
    fetchBlocked,
    fetchSummary,

    archiveReview,
    restoreReview,
    deleteArchivedPermanently,
    blockPhoneEverywhere,
    unblockPhoneEverywhere,

    undo,
    setUndo,
    undoArchive,
  } = useReviewsManager();

  const activeTab =
    tab === "blocked" || tab === "archived" ? tab : "reviews";

  const counts = useMemo(
    () => ({
      reviews: Number(count || 0),
      blocked: blocked?.length || 0,
      archived: archived?.length || 0,
    }),
    [count, blocked, archived],
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

  const anyLoading =
    loadingReviews ||
    loadingArchived ||
    loadingBlocked ||
    loadingSummary ||
    refreshing;

  const filtersActive =
    String(qText || "").trim() !== "" ||
    stars !== "all" ||
    sortBy !== "newest";

  function flash(text) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  async function onRefresh() {
    if (refreshing) return;

    setRefreshing(true);
    setMessage("");

    try {
      await Promise.all([
        fetchReviews({ reset: true }),
        fetchArchived(),
        fetchBlocked(),
        fetchSummary(),
      ]);

      flash("تم تحديث التقييمات.");
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
      setMessage("تعذر إخفاء التقييم. حاول مرة ثانية.");
    }
  }

  async function handleRestore(reviewId) {
    try {
      await restoreReview(reviewId);
      flash("تم إظهار التقييم من جديد.");
    } catch (error) {
      console.error("Failed to restore review:", error);
      setMessage("تعذر إظهار التقييم. حاول مرة ثانية.");
    }
  }

  async function handleDeleteForever(reviewId) {
    const confirmed = window.confirm(
      "حذف التقييم نهائيًا؟ لا يمكن التراجع بعد الحذف.",
    );

    if (!confirmed) return;

    try {
      await deleteArchivedPermanently(reviewId);
      flash("تم حذف التقييم نهائيًا.");
    } catch (error) {
      console.error("Failed to delete archived review:", error);
      setMessage("تعذر حذف التقييم. حاول مرة ثانية.");
    }
  }

  async function handleBlock(phoneKey, reviewId) {
    const confirmed = window.confirm(
      "حظر الزبون؟ لن يتمكن من إرسال تقييمات أو حجوزات جديدة.",
    );

    if (!confirmed) return;

    try {
      await blockPhoneEverywhere(phoneKey, reviewId);
      flash("تم حظر الزبون.");
    } catch (error) {
      console.error("Failed to block phone:", error);
      setMessage("تعذر حظر الزبون. حاول مرة ثانية.");
    }
  }

  async function handleUnblock(phoneKey) {
    try {
      await unblockPhoneEverywhere(phoneKey);
      flash("تم فك الحظر.");
    } catch (error) {
      console.error("Failed to unblock phone:", error);
      setMessage("تعذر فك الحظر. حاول مرة ثانية.");
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 px-3 sm:px-4"
      style={{
        paddingTop: "calc(var(--header-h, 96px) + 12px)",
        paddingBottom: "28px",
      }}
    >
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="shrink-0 text-lg font-black text-slate-950">
                التقييمات
              </h1>

              <span className="truncate text-xs font-bold text-slate-500">
                {count ? `${Number(avg || 0).toFixed(1)} ★ · ${count} تقييم` : "لا يوجد تقييمات"}
              </span>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={anyLoading}
              className="
                shrink-0 rounded-xl border border-slate-200
                bg-slate-50 px-3 py-2
                text-xs font-black text-slate-700
                transition hover:bg-slate-100
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {refreshing ? "..." : "↻ تحديث"}
            </button>
          </div>

          <div className="border-t border-slate-100 p-2">
            <TabsBar
              tab={activeTab}
              setTab={setTab}
              counts={counts}
            />
          </div>
        </section>

        {message ? (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm font-bold",
              message.includes("تعذر")
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {message}
          </div>
        ) : null}

        {activeTab === "reviews" ? (
          <>
            <FiltersBar
              qText={qText}
              setQText={setQText}
              stars={stars}
              setStars={setStars}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-slate-800">
                آراء الزبائن
              </h2>

              <span className="text-[11px] font-bold text-slate-500">
                {filtersActive
                  ? `${filteredReviews.length} نتيجة`
                  : `${count || 0} تقييم`}
              </span>
            </div>

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
        ) : null}

        {activeTab === "blocked" ? (
          <BlockedPhonesPanel
            blocked={blocked}
            loading={loadingBlocked}
            onUnblock={handleUnblock}
          />
        ) : null}

        {activeTab === "archived" ? (
          <ArchivedPanel
            items={archived}
            loading={loadingArchived}
            onRestore={handleRestore}
            onDeleteForever={handleDeleteForever}
          />
        ) : null}
      </div>

      <UndoToast
        undo={undo}
        onUndo={undoArchive}
        onClose={() => setUndo(null)}
      />
    </div>
  );
}
