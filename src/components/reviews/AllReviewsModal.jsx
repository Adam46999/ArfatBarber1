// src/components/reviews/AllReviewsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchReviewsPage } from "./reviewsApi";

// ✅ ملاحظة: ما بفرض ستايل.
// كل الستايلات عبر props.classes (اختياري).
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

  // ✅ (5) Accordion: واحد فقط expanded داخل المودال
  const [openId, setOpenId] = useState(null);

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
        setOpenId(null);
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

  // ✅ (29) أفضل تقييم مثبت بالأعلى (من الموجود حالياً)
  const pinned = useMemo(() => pickBestReview(items), [items]);
  const rest = useMemo(() => {
    if (!pinned) return items;
    return items.filter((x) => x.id !== pinned.id);
  }, [items, pinned]);

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
              {/* ✅ (29) Pinned review */}
              {pinned && (
                <div className={classes.pinnedWrap || ""}>
                  <div className={classes.pinnedBadge || ""}>أفضل تقييم</div>
                  <ReviewRow
                    r={pinned}
                    classes={classes}
                    expanded={openId === pinned.id}
                    onToggle={() =>
                      setOpenId((prev) =>
                        prev === pinned.id ? null : pinned.id,
                      )
                    }
                  />
                </div>
              )}

              {/* باقي التقييمات */}
              {rest.map((r) => (
                <ReviewRow
                  key={r.id}
                  r={r}
                  classes={classes}
                  expanded={openId === r.id}
                  onToggle={() =>
                    setOpenId((prev) => (prev === r.id ? null : r.id))
                  }
                />
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

function ReviewRow({ r, classes, expanded, onToggle }) {
  const name = prettyName(r.userName);
  const stars = clampStars(r.rating);
  const timeAgo = formatTimeAgo(r.createdAt);
  const avatar = buildAvatar(name);

  return (
    <div className={classes.reviewCard}>
      <div className={classes.reviewTopRow}>
        <div className={classes.reviewUserRow || ""}>
          <div
            className={classes.avatarCircle || ""}
            style={avatar.style}
            aria-label={name}
            title={name}
          >
            {avatar.initials}
          </div>

          <div className={classes.userMetaCol || ""}>
            <div className={classes.userName}>{name}</div>
            {!!timeAgo && (
              <div className={classes.reviewTime || ""}>{timeAgo}</div>
            )}
          </div>
        </div>

        <div className={classes.starsRow}>
          <Stars value={stars} classes={classes} interactive />
        </div>
      </div>

      {!!r.comment && (
        <div className={classes.commentWrap}>
          <div
            className={expanded ? classes.commentFull : classes.commentClamp}
          >
            {r.comment}
          </div>

          {String(r.comment).length > 140 && (
            <button className={classes.moreBtn} onClick={onToggle}>
              {expanded ? "إخفاء" : "عرض المزيد"}
            </button>
          )}
        </div>
      )}

      <div className={classes.cardDivider || ""} />
    </div>
  );
}

function Stars({ value, classes, interactive = false }) {
  const v = clampStars(value);
  return (
    <div className={classes.starsInner}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={[
            i < v ? classes.starOn : classes.starOff,
            interactive ? classes.starHover || "" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
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

/** ✅ (29) pick “best review” from loaded items */
function pickBestReview(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  // score = stars * 1000 + commentLength + freshnessBoost
  const scored = items.map((r) => {
    const stars = clampStars(r?.rating);
    const len = String(r?.comment || "").trim().length;
    const d = toDateSafe(r?.createdAt);
    const freshness = d
      ? Math.max(
          0,
          200 - Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)),
        )
      : 0;
    const score = stars * 1000 + len + freshness;
    return { r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // لو أعلى واحد 0 نجمة وما في تعليق، ما نثبت
  if (!scored[0]?.r) return null;
  if (
    clampStars(scored[0].r.rating) === 0 &&
    !String(scored[0].r.comment || "").trim()
  )
    return null;
  return scored[0].r;
}

/** (7) Time ago Arabic */
function formatTimeAgo(createdAt) {
  const d = toDateSafe(createdAt);
  if (!d) return "";

  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
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

  if (v instanceof Date) {
    return !Number.isNaN(v.getTime()) ? v : null;
  }

  const d = new Date(v);
  return !Number.isNaN(d.getTime()) ? d : null;
}

/** (8) Avatar fallback */
function buildAvatar(name) {
  const s = String(name || "").trim();
  const initials = s
    ? s
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "Z";

  const hue = hashHue(s || "customer");
  const style = { backgroundColor: `hsl(${hue} 35% 28%)` };

  return { initials, style };
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
