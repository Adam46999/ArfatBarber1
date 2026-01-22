// src/pages/barberPanel/components/WeeklyHoursEditorMobile.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import WeeklyDayCard from "./WeeklyDayCard";
import StickySaveBar from "./StickySaveBar";

import {
  DAYS,
  deepEqual,
  normalizeWeekly,
  validateWeekly,
} from "../utils/weeklyHours";
import {
  saveWeeklyHours,
  resetWeeklyHoursToDefault,
} from "../../../services/barberWeeklyHours";
import defaultWorkingHours from "../../../constants/workingHours";

function nowTime() {
  try {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date().toLocaleTimeString();
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default function WeeklyHoursEditorMobile({
  loading = false,
  initialWeekly,
  onDirtyChange,
  isArabic = true, // صفحة الحلاق غالباً عربي، لكن صار قابل للتغيير
}) {
  const [weekly, setWeekly] = useState(() => normalizeWeekly(initialWeekly));
  const baseRef = useRef(normalizeWeekly(initialWeekly));

  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  const [lastSavedAt, setLastSavedAt] = useState(null);

  // ✅ لما تتغير initialWeekly (مثلاً دخول/خروج edit mode)
  useEffect(() => {
    const n = normalizeWeekly(initialWeekly);
    setWeekly(n);
    baseRef.current = n;
    setExpanded(null);
    setLastSavedAt(null);
  }, [initialWeekly]);

  const errors = useMemo(
    () => validateWeekly(weekly, isArabic),
    [weekly, isArabic],
  );
  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const dirty = useMemo(() => !deepEqual(baseRef.current, weekly), [weekly]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // ✅ تحذير عند إغلاق التبويب وفيه تغييرات غير محفوظة
  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const t = useMemo(() => {
    const ar = {
      loading: "جاري التحميل...",
      hasErrors: "يوجد أخطاء لازم تتصلّح قبل الحفظ",
      dirty: "تغييرات غير محفوظة",
      saved: "محفوظ",
      lastSaved: "آخر حفظ",
      fixErrors: "أصلح الأخطاء قبل الحفظ.",
      savedOk: "✅ تم الحفظ",
      saveFail: "❌ فشل الحفظ",
      resetConfirm: "راح نرجّع ساعات الأسبوع للوضع الافتراضي. متأكد؟",
      resetOk: "✅ تم الإرجاع",
      resetFail: "❌ فشل الإرجاع",
    };
    const en = {
      loading: "Loading…",
      hasErrors: "Fix errors before saving",
      dirty: "Unsaved changes",
      saved: "Saved",
      lastSaved: "Last saved",
      fixErrors: "Fix errors before saving.",
      savedOk: "✅ Saved",
      saveFail: "❌ Save failed",
      resetConfirm: "Reset weekly hours to default. Continue?",
      resetOk: "✅ Reset done",
      resetFail: "❌ Reset failed",
    };
    return isArabic ? ar : en;
  }, [isArabic]);

  const showToast = (msg, ms = 2200) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), ms);
  };

  const status = useMemo(() => {
    if (loading) return { tone: "neutral", text: t.loading };
    if (hasErrors) return { tone: "danger", text: t.hasErrors };
    if (dirty) return { tone: "warn", text: t.dirty };
    return { tone: "success", text: t.saved };
  }, [loading, hasErrors, dirty, t]);

  const onToggleDay = (dayKey, open) => {
    setWeekly((p) => {
      if (!open) return { ...p, [dayKey]: null };

      // ✅ لما نفتح يوم مغلق: استخدم الافتراضي الرسمي لنفس اليوم (أو fallback)
      const def = defaultWorkingHours?.[dayKey] ?? {
        from: "12:00",
        to: "20:00",
      };
      return { ...p, [dayKey]: def };
    });
  };

  const onChangeDay = (dayKey, patch) => {
    setWeekly((p) => {
      const cur = p[dayKey];
      if (cur === null) return p;
      return { ...p, [dayKey]: { ...cur, ...patch } };
    });
  };

  const onSave = async () => {
    if (loading || saving) return;
    if (hasErrors) {
      showToast(t.fixErrors, 2400);
      return;
    }
    if (!dirty) return;

    try {
      setSaving(true);
      await saveWeeklyHours(weekly);

      // ✅ ثبّت baseline كنسخة (مش نفس المرجع)
      const n = normalizeWeekly(clone(weekly));
      baseRef.current = n;

      setLastSavedAt(nowTime());
      showToast(t.savedOk);
    } catch (e) {
      console.error(e);
      showToast(t.saveFail, 2400);
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (loading || saving) return;

    const ok = window.confirm(t.resetConfirm);
    if (!ok) return;

    try {
      setSaving(true);

      // ✅ يرجّع Firestore للافتراضي الرسمي
      await resetWeeklyHoursToDefault(defaultWorkingHours);

      const n = normalizeWeekly(defaultWorkingHours);
      setWeekly(n);
      baseRef.current = n;

      setLastSavedAt(nowTime());
      showToast(t.resetOk);
    } catch (e) {
      console.error(e);
      showToast(t.resetFail, 2400);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Status */}
      <div
        className={[
          "rounded-2xl border px-4 py-3 text-sm font-extrabold flex items-center justify-between",
          status.tone === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : status.tone === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : status.tone === "danger"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-white border-slate-200 text-slate-700",
        ].join(" ")}
      >
        <span>{status.text}</span>
        <span className="text-xs font-black text-slate-500">
          {lastSavedAt ? `${t.lastSaved}: ${lastSavedAt}` : " "}
        </span>
      </div>

      {/* Days */}
      <div className="space-y-2 pb-60">
        {DAYS.map((d) => (
          <WeeklyDayCard
            key={d.key}
            day={{
              ...d,
              // ✅ لو بدك إنجليزي، وفره هنا بدون ما نكسر الكود القديم
              en: d.en || d.key,
            }}
            isArabic={isArabic}
            value={weekly[d.key]}
            error={errors[d.key]}
            expanded={expanded === d.key}
            onExpand={() => setExpanded((x) => (x === d.key ? null : d.key))}
            onToggleOpen={(open) => onToggleDay(d.key, open)}
            onChange={(patch) => onChangeDay(d.key, patch)}
          />
        ))}
      </div>

      {/* Toast */}
      {toast ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-20">
          <div className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold shadow-xl">
            {toast}
          </div>
        </div>
      ) : null}

      {/* Sticky Save */}
      <StickySaveBar
        isArabic={isArabic}
        disabled={loading || saving || !dirty || hasErrors}
        saving={saving}
        dirty={dirty}
        hasErrors={hasErrors}
        onSave={onSave}
        onReset={onReset}
      />
    </div>
  );
}
