// src/components/reviews/CustomerRatingSection.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import AllReviewsModal from "./AllReviewsModal";
import { fetchLatestReviews, fetchReviewsPage } from "./reviewsApi";

export default function CustomerRatingSection({
  db,
  barberId,
  title = "التقييمات",
  classes,
  previewCount = 3,

  // ✅ (21) Auto-scroll support: إذا بدك تربط زر خارجي بـ #reviews
  anchorId = "reviews",

  // ✅ للملخص (1+2): كم Review نجيب عشان نحسب المتوسط والتوزيع (خفيف ومناسب)
  statsSampleSize = 60,
}) {
  const wrapRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // (1+2) Summary stats
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    avg: 0,
    count: 0,
    dist: [0, 0, 0, 0, 0], // index 0 = 1★ ... index 4 = 5★
  });

  const [openAll, setOpenAll] = useState(false);

  // ✅ (21) لو الرابط فتح الصفحة على #reviews اعمل scroll + highlight
  useEffect(() => {
    if (!anchorId) return;
    if (typeof window === "undefined") return;

    const hash = (window.location.hash || "").replace("#", "");
    if (hash !== anchorId) return;

    // انتظر render بسيط
    const t = setTimeout(() => {
      try {
        wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        // highlight خفيف لو عندك class
        wrapRef.current?.classList?.add?.(classes?.sectionFlash || "");
        setTimeout(() => {
          wrapRef.current?.classList?.remove?.(classes?.sectionFlash || "");
        }, 1200);
        // eslint-disable-next-line no-empty
      } catch {}
    }, 50);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorId]);

  // ✅ Preview cards (آخر 3 تقييمات مثلاً)
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

  // ✅ (1+2) Stats sample fetch (خفيف)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!barberId) {
        setStats({ avg: 0, count: 0, dist: [0, 0, 0, 0, 0] });
        return;
      }

      setStatsLoading(true);
      try {
        // نجيب sample (مثلاً 60) من الأحدث ونحسب منه توزيع/متوسط
        const res = await fetchReviewsPage({
          db,
          barberId,
          pageSize: statsSampleSize,
          afterDoc: null,
        });

        if (!alive) return;

        const computed = computeStats(res.items);
        setStats(computed);
      } finally {
        if (alive) setStatsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [db, barberId, statsSampleSize]);

  const summaryText = useMemo(() => {
    if (statsLoading) return "جارٍ تجهيز الملخص...";
    if (!stats.count) return "لا يوجد تقييمات بعد";
    return `${stats.avg.toFixed(1)} / 5 • (${stats.count} تقييم)`;
  }, [stats, statsLoading]);

  return (
    <div
      ref={wrapRef}
      id={anchorId}
      className={classes.sectionWrap}
      data-section="customer-reviews"
    >
      <div className={classes.sectionTitle}>{title}</div>

      {/* ✅ (1 + 2) Summary block */}
      <div className={classes.ratingSummaryWrap || ""}>
        <div className={classes.ratingSummaryTop || ""}>
          <div className={classes.ratingSummaryAvg || ""}>
            {statsLoading ? "—" : stats.count ? stats.avg.toFixed(1) : "0.0"}
          </div>

          <div className={classes.ratingSummaryMeta || ""}>
            <div className={classes.ratingSummaryLine || ""}>{summaryText}</div>
            {/* نجوم كبيرة (اختياري) */}
            <div className={classes.ratingSummaryStars || ""}>
              <Stars value={stats.avg} classes={classes} interactive />
            </div>
          </div>
        </div>

        {/* ✅ توزيع النجوم Bars */}
        {!!stats.count && (
          <div className={classes.ratingBars || ""}>
            {renderBars(stats, classes)}
          </div>
        )}
      </div>

      {loading ? (
        <div className={classes.loading}>جارٍ التحميل...</div>
      ) : items.length === 0 ? (
        <div className={classes.emptyState}>لا يوجد تقييمات بعد</div>
      ) : (
        <>
          <div className={classes.list}>
            {/* ✅ (5) نفس مبدأ "عرض المزيد" بس Accordion: واحد فقط مفتوح */}
            <AccordionReviews
              items={items}
              classes={classes}
              variant="preview"
            />
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

/** ✅ Accordion list: واحد فقط Expanded في نفس الوقت */
function AccordionReviews({ items, classes, variant }) {
  const [openId, setOpenId] = useState(null);

  return (
    <>
      {items.map((r) => (
        <ReviewCard
          key={r.id}
          r={r}
          classes={classes}
          expanded={openId === r.id}
          onToggle={() => setOpenId((prev) => (prev === r.id ? null : r.id))}
          variant={variant}
        />
      ))}
    </>
  );
}

function ReviewCard({ r, classes, expanded, onToggle, variant }) {
  const name = prettyName(r.userName);
  const stars = clampStars(r.rating);

  // ✅ (7) time ago
  const timeAgo = formatTimeAgo(r.createdAt);

  // ✅ (8) Avatar fallback
  const avatar = buildAvatar(name);

  return (
    <div className={classes.reviewCard}>
      <div className={classes.reviewTopRow}>
        {/* Avatar + Name + time */}
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
          {/* ✅ (9) nicer stars hover */}
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

      {/* ✅ (28) spacing polish (اختياري) */}
      {variant === "preview" && <div className={classes.cardDivider || ""} />}
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

/** (1+2) Compute avg + distribution */
function computeStats(items) {
  const dist = [0, 0, 0, 0, 0];
  const count = Array.isArray(items) ? items.length : 0;

  if (!count) return { avg: 0, count: 0, dist };

  let sum = 0;
  for (const r of items) {
    const s = clampStars(r?.rating);
    if (s >= 1 && s <= 5) dist[s - 1] += 1;
    sum += s;
  }

  return { avg: sum / count, count, dist };
}

function renderBars(stats, classes) {
  const total = stats.count || 0;
  if (!total) return null;

  // display order: 5★ -> 1★
  const rows = [
    { star: 5, n: stats.dist[4] },
    { star: 4, n: stats.dist[3] },
    { star: 3, n: stats.dist[2] },
    { star: 2, n: stats.dist[1] },
    { star: 1, n: stats.dist[0] },
  ];

  return rows.map((row) => {
    const pct = Math.round((row.n / total) * 100);
    return (
      <div key={row.star} className={classes.ratingBarRow || ""}>
        <div className={classes.ratingBarLabel || ""}>{row.star}★</div>

        <div className={classes.ratingBarTrack || ""}>
          <div
            className={classes.ratingBarFill || ""}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className={classes.ratingBarValue || ""}>
          {pct}%{row.n ? ` • ${row.n}` : ""}
        </div>
      </div>
    );
  });
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

/** (7) Firestore Timestamp / Date / number -> time ago (Arabic) */
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

  // Firestore Timestamp
  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }

  // { seconds, nanoseconds }
  if (typeof v?.seconds === "number") {
    const d = new Date(v.seconds * 1000);
    return !Number.isNaN(d.getTime()) ? d : null;
  }

  // Date
  if (v instanceof Date) {
    return !Number.isNaN(v.getTime()) ? v : null;
  }

  // number or string date
  const d = new Date(v);
  return !Number.isNaN(d.getTime()) ? d : null;
}

/** (8) Avatar fallback: initials + stable style */
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
  // ما نفرض ألوان صارخة: نستخدم HSL هادئ
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
