// src/components/reviews/AllReviewsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchReviewsPage } from "./reviewsApi";

// ✅ ملاحظة: أنا ما بفرض ستايل.
// كل الستايلات جوا props.classes عشان تنسخها من صفحة الزبون الحالية.
export default function AllReviewsModal({
  open,
  onClose,
  db,
  barberId,
  classes,
  title = "كل التقييمات",
  pageSize = 10,
}) {
  const [items, setItems] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const canLoadMore = useMemo(() => !!lastDoc, [lastDoc]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchReviewsPage({
          db,
          barberId,
          pageSize,
          afterDoc: null,
        });
        if (!alive) return;
        setItems(res.items);
        setLastDoc(res.lastDoc);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, db, barberId, pageSize]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchReviewsPage({
        db,
        barberId,
        pageSize,
        afterDoc: lastDoc,
      });
      setItems((p) => [...p, ...res.items]);
      setLastDoc(res.lastDoc);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!open) return null;

  return (
    <div className={classes.modalOverlay} onClick={onClose}>
      <div className={classes.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={classes.modalHeader}>
          <div className={classes.modalTitle}>{title}</div>
          <button className={classes.modalCloseBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={classes.modalBody}>
          {loading ? (
            <div className={classes.loading}>جارٍ التحميل...</div>
          ) : items.length === 0 ? (
            <div className={classes.emptyState}>
              لا يوجد تقييمات لعرضها حاليًا
            </div>
          ) : (
            <div className={classes.list}>
              {items.map((r) => (
                <ReviewRow key={r.id} r={r} classes={classes} />
              ))}
            </div>
          )}

          {canLoadMore && !loading && (
            <button
              className={classes.loadMoreBtn}
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "جارٍ تحميل المزيد..." : "تحميل المزيد"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ r, classes }) {
  const [expanded, setExpanded] = useState(false);

  const name = prettyName(r.userName);
  const stars = clampStars(r.rating);

  return (
    <div className={classes.reviewCard}>
      <div className={classes.reviewTopRow}>
        <div className={classes.starsRow}>
          <Stars value={stars} classes={classes} />
        </div>

        {/* ✅ اسم الزبون */}
        <div className={classes.userName}>{name}</div>
      </div>

      {!!r.comment && (
        <div className={classes.commentWrap}>
          <div
            className={expanded ? classes.commentFull : classes.commentClamp}
          >
            {r.comment}
          </div>

          {String(r.comment).length > 140 && (
            <button
              className={classes.moreBtn}
              onClick={() => setExpanded((p) => !p)}
            >
              {expanded ? "إخفاء" : "عرض المزيد"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stars({ value, classes }) {
  // رسم نجوم بسيط بدون فرض ألوان جديدة — استخدم كلاس مشروعك
  const v = clampStars(value);
  return (
    <div className={classes.starsInner}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < v ? classes.starOn : classes.starOff}>
          ★
        </span>
      ))}
    </div>
  );
}

function clampStars(x) {
  const n = Number(x || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function prettyName(name) {
  const s = String(name || "").trim();
  if (!s) return "زبون";
  // Ahmad S. style (بدون ما نكسر أسماء عربية)
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0] || "";
  return `${first} ${lastInitial}.`;
}
