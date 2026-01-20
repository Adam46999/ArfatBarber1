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
  return new Date().toLocaleTimeString();
}

export default function WeeklyHoursEditorMobile({
  loading,
  initialWeekly,
  onDirtyChange,
}) {
  const [weekly, setWeekly] = useState(() => normalizeWeekly(initialWeekly));
  const baseRef = useRef(normalizeWeekly(initialWeekly));

  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    const n = normalizeWeekly(initialWeekly);
    setWeekly(n);
    baseRef.current = n;
    setExpanded(null);
    setLastSavedAt(null);
  }, [initialWeekly]);

  const errors = useMemo(() => validateWeekly(weekly), [weekly]);
  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const dirty = useMemo(() => !deepEqual(baseRef.current, weekly), [weekly]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const status = loading
    ? { tone: "neutral", text: "جاري التحميل..." }
    : hasErrors
      ? { tone: "danger", text: "يوجد أخطاء لازم تتصلّح" }
      : dirty
        ? { tone: "warn", text: "تغييرات غير محفوظة" }
        : { tone: "success", text: "محفوظ" };

  const showToast = (t, ms = 2000) => {
    setToast(t);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), ms);
  };

  const onToggleDay = (dayKey, open) => {
    setWeekly((p) => {
      if (!open) return { ...p, [dayKey]: null };

      // ✅ لما نفتح يوم مغلق: استخدم الافتراضي الرسمي لنفس اليوم
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
      showToast("أصلح الأخطاء قبل الحفظ.", 2400);
      return;
    }
    if (!dirty) return;

    try {
      setSaving(true);
      await saveWeeklyHours(weekly);
      baseRef.current = weekly;
      setLastSavedAt(nowTime());
      showToast("✅ تم الحفظ");
    } catch (e) {
      console.error(e);
      showToast("❌ فشل الحفظ", 2400);
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (loading || saving) return;

    const ok = window.confirm(
      "راح نرجّع ساعات الأسبوع للوضع الافتراضي. متأكد؟",
    );
    if (!ok) return;

    try {
      setSaving(true);
      await resetWeeklyHoursToDefault(defaultWorkingHours);
      const n = normalizeWeekly(defaultWorkingHours);
      setWeekly(n);
      baseRef.current = n;
      setLastSavedAt(nowTime());
      showToast("✅ تم الإرجاع");
    } catch (e) {
      console.error(e);
      showToast("❌ فشل الإرجاع", 2400);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
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
          {lastSavedAt ? `آخر حفظ: ${lastSavedAt}` : " "}
        </span>
      </div>

      <div className="space-y-2 pb-20">
        {DAYS.map((d) => (
          <WeeklyDayCard
            key={d.key}
            day={d}
            isArabic={true}
            value={weekly[d.key]}
            error={errors[d.key]}
            expanded={expanded === d.key}
            onExpand={() => setExpanded((x) => (x === d.key ? null : d.key))}
            onToggleOpen={(open) => onToggleDay(d.key, open)}
            onChange={(patch) => onChangeDay(d.key, patch)}
          />
        ))}
      </div>

      {toast ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-20">
          <div className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold shadow-xl">
            {toast}
          </div>
        </div>
      ) : null}

      <StickySaveBar
        isArabic={true}
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
