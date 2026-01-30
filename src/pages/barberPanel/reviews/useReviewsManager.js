// src/pages/barberPanel/reviews/useReviewsManager.js
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
} from "firebase/firestore";

const BARBER_ID = "arfat";
const ARCHIVE_KEEP_DAYS = 14;
const UNDO_MS = 7000;

function addDaysDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function safeLower(v) {
  return (v || "").toString().toLowerCase();
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

function safeSummary(data) {
  return (
    data || {
      count: 0,
      sum: 0,
      byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      tagCounts: {},
    }
  );
}

function decSummary(cur, rating, tags = []) {
  const r = Number(rating || 0);
  const next = {
    ...cur,
    count: Math.max(0, Number(cur.count || 0) - 1),
    sum: Math.max(0, Number(cur.sum || 0) - r),
    byStar: { ...(cur.byStar || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) },
    tagCounts: { ...(cur.tagCounts || {}) },
  };
  if (r >= 1 && r <= 5)
    next.byStar[r] = Math.max(0, Number(next.byStar[r] || 0) - 1);

  (Array.isArray(tags) ? tags : []).forEach((k) => {
    next.tagCounts[k] = Math.max(0, Number(next.tagCounts[k] || 0) - 1);
    if (next.tagCounts[k] === 0) delete next.tagCounts[k];
  });

  return next;
}

function incSummary(cur, rating, tags = []) {
  const r = Number(rating || 0);
  const next = {
    ...cur,
    count: Number(cur.count || 0) + 1,
    sum: Number(cur.sum || 0) + r,
    byStar: { ...(cur.byStar || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) },
    tagCounts: { ...(cur.tagCounts || {}) },
  };
  if (r >= 1 && r <= 5) next.byStar[r] = Number(next.byStar[r] || 0) + 1;

  (Array.isArray(tags) ? tags : []).forEach((k) => {
    next.tagCounts[k] = Number(next.tagCounts[k] || 0) + 1;
  });

  return next;
}

export function useReviewsManager() {
  const [tab, setTab] = useState("reviews"); // reviews | blocked | archived

  // Active reviews
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Archived
  const [archived, setArchived] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Blocked
  const [blocked, setBlocked] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Filters / sort
  const [qText, setQText] = useState("");
  const [stars, setStars] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest | highest | lowest

  // Summary
  const [summary, setSummary] = useState({
    count: 0,
    sum: 0,
    byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    tagCounts: {},
  });
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Undo toast
  const [undo, setUndo] = useState(null); // { id, name }
  const undoTimerRef = useRef(null);

  const reviewsCol = collection(db, "barbers", BARBER_ID, "reviews");
  const summaryRef = doc(db, "barbers", BARBER_ID, "meta", "reviewsSummary");

  const count = Number(summary.count || 0);
  const avg = count > 0 ? summary.sum / count : 0;

  const fetchSummary = async () => {
    if (loadingSummary) return;
    setLoadingSummary(true);
    try {
      const ss = await getDoc(summaryRef);
      if (ss.exists()) setSummary((p) => ({ ...p, ...ss.data() }));
    } catch (e) {
      console.error("fetchSummary error:", e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchReviews = async ({ reset = false } = {}) => {
    if (loadingReviews) return;
    setLoadingReviews(true);

    try {
      let qBase = query(reviewsCol, orderBy("createdAt", "desc"), limit(50));

      if (!reset && lastDoc) {
        qBase = query(
          reviewsCol,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(50),
        );
      }

      const snap = await getDocs(qBase);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // active فقط
      const onlyActive = docs.filter(
        (r) => (r.status || "active") === "active",
      );

      if (reset) setReviews(onlyActive);
      else setReviews((p) => [...p, ...onlyActive]);

      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      setHasMore(snap.docs.length === 50);
    } catch (e) {
      console.error("fetchReviews error:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchBlocked = async () => {
    if (loadingBlocked) return;
    setLoadingBlocked(true);
    try {
      const ref = collection(db, "barbers", BARBER_ID, "blockedPhones");
      const snap = await getDocs(ref);
      setBlocked(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoadingBlocked(false);
    }
  };

  const fetchArchived = async () => {
    if (loadingArchived) return;
    setLoadingArchived(true);
    try {
      const qAll = query(reviewsCol, orderBy("createdAt", "desc"), limit(200));
      const snap = await getDocs(qAll);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setArchived(docs.filter((r) => r.status === "archived"));
    } catch (e) {
      console.error("fetchArchived error:", e);
    } finally {
      setLoadingArchived(false);
    }
  };

  useEffect(() => {
    fetchReviews({ reset: true });
    fetchBlocked();
    fetchArchived();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blockPhoneEverywhere = async (phoneKey, reviewId) => {
    if (!phoneKey) return;

    await setDoc(
      doc(db, "barbers", BARBER_ID, "blockedPhones", String(phoneKey)),
      {
        phoneKey: String(phoneKey),
        from: "reviews",
        fromBarberId: BARBER_ID,
        reviewId: reviewId || null,
        blockedAt: serverTimestamp(),
      },
    );

    await setDoc(doc(db, "blockedPhones", String(phoneKey)), {
      phoneKey: String(phoneKey),
      from: "reviews",
      fromBarberId: BARBER_ID,
      reviewId: reviewId || null,
      blockedAt: serverTimestamp(),
    });

    await fetchBlocked();
  };

  const unblockPhoneEverywhere = async (phoneKey) => {
    if (!phoneKey) return;
    await deleteDoc(
      doc(db, "barbers", BARBER_ID, "blockedPhones", String(phoneKey)),
    );
    await deleteDoc(doc(db, "blockedPhones", String(phoneKey)));
    await fetchBlocked();
  };

  const archiveReview = async (reviewId) => {
    if (!reviewId) return;

    const rLocal = reviews.find((x) => x.id === reviewId);
    const nameForUndo = prettyName(
      rLocal?.customerName || rLocal?.userName || rLocal?.displayName,
    );

    await runTransaction(db, async (tx) => {
      const reviewRef = doc(db, "barbers", BARBER_ID, "reviews", reviewId);
      const [rSnap, sSnap] = await Promise.all([
        tx.get(reviewRef),
        tx.get(summaryRef),
      ]);
      if (!rSnap.exists()) return;

      const r = rSnap.data();
      if (r.status === "archived") return;

      const cur = safeSummary(sSnap.exists() ? sSnap.data() : null);
      const rating = r.rating ?? r.stars ?? 0;
      const tags = r.tags || [];
      const next = decSummary(cur, rating, tags);

      tx.set(
        reviewRef,
        {
          status: "archived",
          archivedAt: serverTimestamp(),
          purgeAt: addDaysDate(ARCHIVE_KEEP_DAYS),
        },
        { merge: true },
      );

      tx.set(
        summaryRef,
        { ...next, updatedAt: serverTimestamp() },
        { merge: true },
      );
    });

    setReviews((p) => p.filter((x) => x.id !== reviewId));
    await fetchArchived();
    await fetchSummary();

    setUndo({ id: reviewId, name: nameForUndo });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndo(null);
      undoTimerRef.current = null;
    }, UNDO_MS);
  };

  const restoreReview = async (reviewId) => {
    if (!reviewId) return;

    await runTransaction(db, async (tx) => {
      const reviewRef = doc(db, "barbers", BARBER_ID, "reviews", reviewId);
      const [rSnap, sSnap] = await Promise.all([
        tx.get(reviewRef),
        tx.get(summaryRef),
      ]);
      if (!rSnap.exists()) return;

      const r = rSnap.data();
      if (r.status !== "archived") return;

      const cur = safeSummary(sSnap.exists() ? sSnap.data() : null);
      const rating = r.rating ?? r.stars ?? 0;
      const tags = r.tags || [];
      const next = incSummary(cur, rating, tags);

      tx.set(
        reviewRef,
        { status: "active", restoredAt: serverTimestamp(), purgeAt: null },
        { merge: true },
      );

      tx.set(
        summaryRef,
        { ...next, updatedAt: serverTimestamp() },
        { merge: true },
      );
    });

    await fetchReviews({ reset: true });
    await fetchArchived();
    await fetchSummary();
  };

  const undoArchive = async () => {
    if (!undo?.id) return;
    const id = undo.id;
    setUndo(null);
    await restoreReview(id);
  };

  const deleteArchivedPermanently = async (reviewId) => {
    if (!reviewId) return;
    await deleteDoc(doc(db, "barbers", BARBER_ID, "reviews", reviewId));
    await fetchArchived();
    await fetchSummary();
  };

  // ===== Derived / filtered list =====
  const filteredReviews = useMemo(() => {
    let list = Array.isArray(reviews) ? [...reviews] : [];

    // stars filter
    if (stars !== "all") {
      const s = Number(stars);
      list = list.filter((r) => Number(r.rating ?? r.stars ?? 0) === s);
    }

    // search
    const q = safeLower(qText).trim();
    if (q) {
      list = list.filter((r) => {
        const name = safeLower(r.customerName || r.userName || r.displayName);
        const phone = safeLower(r.phoneKey || r.phone || r.phoneNumber);
        const msg = safeLower(r.message || r.text || r.comment);
        return name.includes(q) || phone.includes(q) || msg.includes(q);
      });
    }

    // sort
    if (sortBy === "highest") {
      list.sort(
        (a, b) =>
          Number(b.rating ?? b.stars ?? 0) - Number(a.rating ?? a.stars ?? 0),
      );
    } else if (sortBy === "lowest") {
      list.sort(
        (a, b) =>
          Number(a.rating ?? a.stars ?? 0) - Number(b.rating ?? b.stars ?? 0),
      );
    } else {
      // newest is already from firestore, keep stable
    }

    return list;
  }, [reviews, qText, stars, sortBy]);

  return {
    tab,
    setTab,

    // data
    reviews,
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

    blockPhoneEverywhere,
    unblockPhoneEverywhere,

    archiveReview,
    restoreReview,
    undoArchive,
    deleteArchivedPermanently,

    // undo toast
    undo,
    setUndo,
  };
}
