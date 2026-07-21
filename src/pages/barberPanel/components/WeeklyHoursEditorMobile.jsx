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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export default function WeeklyHoursEditorMobile({
  loading = false,
  initialWeekly,
  onDirtyChange,
  onSaved,
  isArabic = true,
}) {
  const normalizedInitial = normalizeWeekly(initialWeekly);

  const [weekly, setWeekly] = useState(() => clone(normalizedInitial));
  const baseRef = useRef(clone(normalizedInitial));

  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  const [lastSavedAt, setLastSavedAt] = useState(null);

  /**
   * عندما تصل نسخة جديدة من الصفحة الأم:
   * نعتمدها فقط إذا المحرر ليس في منتصف الحفظ.
   */
  useEffect(() => {
    if (saving) return;

    const normalized = normalizeWeekly(initialWeekly);
    const nextWeekly = clone(normalized);

    setWeekly(nextWeekly);
    baseRef.current = clone(nextWeekly);
    setExpanded(null);
    setLastSavedAt(null);
  }, [initialWeekly, saving]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const errors = useMemo(
    () => validateWeekly(weekly, isArabic),
    [weekly, isArabic],
  );

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const dirty = useMemo(() => !deepEqual(baseRef.current, weekly), [weekly]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  /**
   * تحذير عند إغلاق أو تحديث الصفحة
   * إذا كانت هناك تغييرات غير محفوظة.
   */
  useEffect(() => {
    const handler = (event) => {
      if (!dirty) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [dirty]);

  const t = useMemo(() => {
    const ar = {
      loading: "جاري التحميل...",
      hasErrors: "يوجد أخطاء لازم تتصلّح قبل الحفظ",
      dirty: "تغييرات غير محفوظة",
      saved: "محفوظ",
      lastSaved: "آخر حفظ",
      fixErrors: "أصلح الأخطاء قبل الحفظ.",
      savedOk: "✅ تم حفظ ساعات العمل",
      saveFail: "❌ فشل حفظ ساعات العمل",
      conflict:
        "⚠️ تم تعديل نفس اليوم من جهاز أو صفحة ثانية. حدّث الصفحة وشوف آخر ساعات محفوظة.",
      resetConfirm: "راح نرجّع ساعات الأسبوع للوضع الافتراضي. متأكد؟",
      resetOk: "✅ تم إرجاع الساعات الافتراضية",
      resetFail: "❌ فشل إرجاع الساعات",
    };

    const en = {
      loading: "Loading…",
      hasErrors: "Fix errors before saving",
      dirty: "Unsaved changes",
      saved: "Saved",
      lastSaved: "Last saved",
      fixErrors: "Fix errors before saving.",
      savedOk: "✅ Working hours saved",
      saveFail: "❌ Failed to save working hours",
      conflict:
        "⚠️ The same day was changed from another device or tab. Refresh to view the latest saved hours.",
      resetConfirm: "Reset weekly hours to default. Continue?",
      resetOk: "✅ Default hours restored",
      resetFail: "❌ Failed to reset hours",
    };

    return isArabic ? ar : en;
  }, [isArabic]);

  const showToast = (message, duration = 2200) => {
    setToast(message);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
    }, duration);
  };

  const status = useMemo(() => {
    if (loading) {
      return {
        tone: "neutral",
        text: t.loading,
      };
    }

    if (hasErrors) {
      return {
        tone: "danger",
        text: t.hasErrors,
      };
    }

    if (dirty) {
      return {
        tone: "warn",
        text: t.dirty,
      };
    }

    return {
      tone: "success",
      text: t.saved,
    };
  }, [loading, hasErrors, dirty, t]);

  const onToggleDay = (dayKey, open) => {
    setWeekly((previous) => {
      if (!open) {
        /**
         * null تعني أن اليوم مغلق أسبوعيًا.
         * هذه القيمة تُحفظ كما هي في Firebase.
         */
        return {
          ...previous,
          [dayKey]: null,
        };
      }

      /**
       * إذا فتح الحلاق يومًا مغلقًا:
       * استخدم الساعات الافتراضية لذلك اليوم.
       */
      const defaultDay = defaultWorkingHours?.[dayKey] ?? {
        from: "12:00",
        to: "20:00",
      };

      return {
        ...previous,
        [dayKey]: clone(defaultDay),
      };
    });
  };

  const onChangeDay = (dayKey, patch) => {
    setWeekly((previous) => {
      const currentDay = previous[dayKey];

      if (currentDay === null) {
        return previous;
      }

      return {
        ...previous,
        [dayKey]: {
          ...currentDay,
          ...patch,
        },
      };
    });
  };

  const onSave = async () => {
    if (loading || saving) return;

    if (hasErrors) {
      showToast(t.fixErrors, 2600);
      return;
    }

    if (!dirty) return;

    try {
      setSaving(true);

      /**
       * نرسل:
       * 1. الجدول الجديد.
       * 2. الجدول الأصلي الذي بدأ منه الحلاق.
       *
       * الخدمة ستمنع نسخة قديمة من الكتابة
       * فوق تعديل أحدث موجود في Firebase.
       */
      const result = await saveWeeklyHours(
        clone(weekly),
        clone(baseRef.current),
      );

      /**
       * نعتمد النسخة التي أكد Firebase حفظها،
       * وليس النسخة المحلية فقط.
       */
      const savedWeekly = normalizeWeekly(result?.weekly ?? weekly);

      const confirmedWeekly = clone(savedWeekly);

      setWeekly(confirmedWeekly);
      baseRef.current = clone(confirmedWeekly);

      setLastSavedAt(nowTime());
      onDirtyChange?.(false);

      /**
       * نرسل النسخة المحفوظة للصفحة الأم
       * حتى لا تبقى محتفظة بساعات قديمة.
       */
      onSaved?.(clone(confirmedWeekly), result);

      showToast(t.savedOk);
    } catch (error) {
      console.error("Weekly hours save error:", error);

      if (error?.code === "weekly-hours-conflict") {
        showToast(t.conflict, 5000);
      } else {
        showToast(t.saveFail, 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (loading || saving) return;

    const confirmed = window.confirm(t.resetConfirm);
    if (!confirmed) return;

    try {
      setSaving(true);

      const result = await resetWeeklyHoursToDefault(defaultWorkingHours);

      const savedWeekly = normalizeWeekly(
        result?.weekly ?? defaultWorkingHours,
      );

      const confirmedWeekly = clone(savedWeekly);

      setWeekly(confirmedWeekly);
      baseRef.current = clone(confirmedWeekly);

      setLastSavedAt(nowTime());
      onDirtyChange?.(false);

      onSaved?.(clone(confirmedWeekly), result);

      showToast(t.resetOk);
    } catch (error) {
      console.error("Weekly hours reset error:", error);
      showToast(t.resetFail, 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* حالة الحفظ */}
      <div
        className={[
          "rounded-2xl border px-4 py-3 text-sm font-extrabold",
          "flex items-center justify-between",
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

      {/* أيام الأسبوع */}
      <div className="space-y-2 pb-2">
        {DAYS.map((day) => (
          <WeeklyDayCard
            key={day.key}
            day={{
              ...day,
              en: day.en || day.key,
            }}
            isArabic={isArabic}
            value={weekly[day.key]}
            error={errors[day.key]}
            expanded={expanded === day.key}
            onExpand={() => {
              setExpanded((current) => (current === day.key ? null : day.key));
            }}
            onToggleOpen={(open) => {
              onToggleDay(day.key, open);
            }}
            onChange={(patch) => {
              onChangeDay(day.key, patch);
            }}
          />
        ))}
      </div>

      {/* رسالة النتيجة */}
      {toast ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-20">
          <div className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold shadow-xl text-center">
            {toast}
          </div>
        </div>
      ) : null}

      {/* شريط الحفظ */}
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
