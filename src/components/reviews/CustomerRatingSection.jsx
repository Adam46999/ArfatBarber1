// src/components/reviews/CustomerRatingSection.jsx
import { useEffect, useState } from "react";
import AllReviewsModal from "./AllReviewsModal";
import { fetchLatestReviews } from "./reviewsApi";

export default function CustomerRatingSection({
  db,
  barberId,
  title = "التقييمات",
  classes,
  previewCount = 3,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAll, setOpenAll] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!barberId) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetchLatestReviews({
          db,
          barberId,
          pageSize: previewCount,
        });

        if (!alive) return;
        setItems(res.items);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [db, barberId, previewCount]);

  return (
    <div className={classes.sectionWrap}>
      <div className={classes.sectionTitle}>{title}</div>

      {loading ? (
        <div className={classes.loading}>جارٍ التحميل...</div>
      ) : items.length === 0 ? (
        <div className={classes.emptyState}>لا يوجد تقييمات بعد</div>
      ) : (
        <>
          <div className={classes.list}>
            {items.map((r) => (
              <PreviewReviewCard key={r.id} r={r} classes={classes} />
            ))}
          </div>

          <div className={classes.viewAllRow}>
            <button
              className={classes.viewAllBtn}
              onClick={() => setOpenAll(true)}
            >
              عرض كل التقييمات
            </button>
          </div>
        </>
      )}

      <AllReviewsModal
        open={openAll}
        onClose={() => setOpenAll(false)}
        db={db}
        barberId={barberId}
        classes={classes}
        title="كل التقييمات"
      />
    </div>
  );
}

function PreviewReviewCard({ r, classes }) {
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
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0] || "";
  return `${first} ${lastInitial}.`;
}
