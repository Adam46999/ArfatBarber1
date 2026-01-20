// src/pages/barberPanel/components/WeeklyHoursEditor.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import defaultWorkingHours from "../../../constants/workingHours";

const DAYS = [
  { key: "Sunday", ar: "الأحد" },
  { key: "Monday", ar: "الإثنين" },
  { key: "Tuesday", ar: "الثلاثاء" },
  { key: "Wednesday", ar: "الأربعاء" },
  { key: "Thursday", ar: "الخميس" },
  { key: "Friday", ar: "الجمعة" },
  { key: "Saturday", ar: "السبت" },
];

function isHHmm(v) {
  return typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
}
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}
function normalize(h) {
  const out = {};
  for (const d of DAYS) out[d.key] = h?.[d.key] ?? null;
  return out;
}
function formatRange(v) {
  if (!v) return "مغلق";
  if (!v.from || !v.to) return "—";
  return `${v.from} → ${v.to}`;
}
function validateWeekly(weekly) {
  const errors = {};
  for (const d of DAYS) {
    const v = weekly[d.key];
    if (v === null) continue;

    if (!isHHmm(v.from) || !isHHmm(v.to)) {
      errors[d.key] = "صيغة الوقت لازم تكون HH:mm";
      continue;
    }
    const a = toMinutes(v.from);
    const b = toMinutes(v.to);
    if (!(a < b)) {
      errors[d.key] = '"من" لازم تكون أصغر من "إلى"';
      continue;
    }
  }
  return errors;
}

function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "px-3 py-2 rounded-xl text-sm font-extrabold transition disabled:opacity-60 disabled:cursor-not-allowed " +
        className
      }
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-44 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function WeeklyHoursEditor({
  weeklyHours,
  loadingWeekly,
  isArabic = true,
  onStateChange,
}) {
  const [draft, setDraft] = useState(() => normalize(weeklyHours));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [expandedDay, setExpandedDay] = useState(null);

  // لالتقاط آخر حفظ (لـ StatusCard في الصفحة لو بدك)
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // snapshot مرجعي لقياس التغييرات
  const baseRef = useRef(normalize(weeklyHours));

  useEffect(() => {
    const next = normalize(weeklyHours);
    setDraft(next);
    baseRef.current = next;
    setLastSavedAt(null);
  }, [weeklyHours]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(baseRef.current) !== JSON.stringify(normalize(draft));
  }, [draft]);

  const errors = useMemo(() => validateWeekly(normalize(draft)), [draft]);
  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const openDaysCount = useMemo(() => {
    return DAYS.reduce((acc, d) => acc + (draft?.[d.key] ? 1 : 0), 0);
  }, [draft]);

  // ابلغ الصفحة بحالة المحرر (StatusCard)
  useEffect(() => {
    onStateChange?.({
      hasChanges,
      hasErrors,
      lastSavedAt,
    });
  }, [hasChanges, hasErrors, lastSavedAt, onStateChange]);

  // تأكيد عند الخروج لو في تغييرات
  useEffect(() => {
    const handler = (e) => {
      if (!hasChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const toast = (text, timeout = 2200) => {
    setMsg(text);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setMsg(""), timeout);
  };

  const toggleExpanded = (dayKey) => {
    setExpandedDay((cur) => (cur === dayKey ? null : dayKey));
  };

  const setDayClosed = (dayKey, closed) => {
    setDraft((p) => ({
      ...p,
      [dayKey]: closed ? null : { from: "12:00", to: "20:00" },
    }));
  };

  const setDayField = (dayKey, field, value) => {
    setDraft((p) => {
      const cur = p[dayKey];
      if (cur === null) return p;
      return { ...p, [dayKey]: { ...cur, [field]: value } };
    });
  };

  const applyDayToAllOpen = (sourceDayKey) => {
    const src = draft?.[sourceDayKey];
    if (!src || src === null) return;

    setDraft((p) => {
      const next = { ...p };
      for (const d of DAYS) {
        if (next[d.key] !== null) next[d.key] = { from: src.from, to: src.to };
      }
      return next;
    });

    toast(
      isArabic
        ? "✅ تم تطبيق ساعات اليوم على كل الأيام المفتوحة"
        : "✅ Applied to all open days",
    );
  };

  const applyTemplate6Days = () => {
    setDraft((p) => {
      const next = { ...p };
      for (const d of DAYS) {
        if (d.key === "Saturday") next[d.key] = null;
        else next[d.key] = next[d.key] ?? { from: "12:00", to: "20:00" };
      }
      return next;
    });
    toast(isArabic ? "✅ تم تطبيق قالب 6 أيام" : "✅ Applied 6-day template");
  };

  const openAll = () => {
    setDraft((p) => {
      const next = { ...p };
      for (const d of DAYS)
        next[d.key] = next[d.key] ?? { from: "12:00", to: "20:00" };
      return next;
    });
    toast(isArabic ? "✅ تم فتح كل الأيام" : "✅ Opened all days");
  };

  const closeSaturday = () => {
    setDraft((p) => ({ ...p, Saturday: null }));
    toast(isArabic ? "✅ تم إغلاق السبت" : "✅ Closed Saturday");
  };

  const save = async () => {
    if (hasErrors) {
      toast(
        isArabic
          ? "⚠️ في أخطاء بالساعات. أصلحها قبل الحفظ."
          : "⚠️ Fix errors before saving.",
        2600,
      );
      return;
    }
    if (!hasChanges) return;

    try {
      setSaving(true);
      setMsg("");

      await setDoc(
        doc(db, "barberSettings", "hours"),
        { weekly: normalize(draft) },
        { merge: true },
      );

      baseRef.current = normalize(draft);
      setLastSavedAt(new Date().toLocaleTimeString());
      toast(
        isArabic ? "✅ تم حفظ ساعات الأسبوع" : "✅ Saved weekly hours",
        2200,
      );
    } catch (e) {
      console.error("save weekly hours error:", e);
      toast(
        isArabic
          ? "❌ صار خطأ بالحفظ. جرّب مرة ثانية."
          : "❌ Save failed. Try again.",
        2600,
      );
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    const ok = window.confirm(
      isArabic
        ? "راح نرجّع ساعات الأسبوع للوضع الافتراضي. متأكد؟"
        : "Reset weekly hours to default. Are you sure?",
    );
    if (!ok) return;

    try {
      setSaving(true);
      setMsg("");

      await setDoc(
        doc(db, "barberSettings", "hours"),
        { weekly: defaultWorkingHours },
        { merge: true },
      );

      // نحدّث الدرفت فوراً لUX سريع (والـ hook رح يزامن لاحقاً)
      setDraft(normalize(defaultWorkingHours));
      baseRef.current = normalize(defaultWorkingHours);
      setLastSavedAt(new Date().toLocaleTimeString());

      toast(
        isArabic
          ? "✅ تم إرجاع ساعات الأسبوع للوضع الافتراضي"
          : "✅ Reset to default",
        2400,
      );
    } catch (e) {
      console.error("reset weekly hours error:", e);
      toast(
        isArabic
          ? "❌ صار خطأ. جرّب مرة ثانية."
          : "❌ Reset failed. Try again.",
        2600,
      );
    } finally {
      setSaving(false);
    }
  };

  // ✅ Sticky Save Bar (نفس vibe الحجوزات)
  const StickyBar = (
    <div className="sticky bottom-4 z-10">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="info">
            {isArabic
              ? `أيام مفتوحة: ${openDaysCount}/7`
              : `Open days: ${openDaysCount}/7`}
          </Pill>

          {loadingWeekly ? (
            <Pill tone="neutral">{isArabic ? "تحميل..." : "Loading..."}</Pill>
          ) : null}

          {hasErrors ? (
            <Pill tone="danger">{isArabic ? "يوجد أخطاء" : "Errors"}</Pill>
          ) : hasChanges ? (
            <Pill tone="warn">
              {isArabic ? "تغييرات غير محفوظة" : "Unsaved changes"}
            </Pill>
          ) : (
            <Pill tone="success">{isArabic ? "محفوظ" : "Saved"}</Pill>
          )}

          <span className="text-xs text-slate-500 font-bold">
            {isArabic
              ? "هذه الساعات تظهر للزبائن في صفحة الحجز."
              : "These hours affect what customers can book."}
          </span>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            type="button"
            disabled={saving || loadingWeekly}
            onClick={resetToDefault}
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-900"
          >
            {isArabic ? "رجّع الافتراضي" : "Reset"}
          </Button>

          <Button
            type="button"
            disabled={saving || loadingWeekly || !hasChanges || hasErrors}
            onClick={save}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ"
                : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-10">
      {/* Card Header + Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                🗓️ {isArabic ? "ساعات الأسبوع" : "Weekly hours"}
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-5">
                {isArabic
                  ? "اضغط على اليوم لتفتح التعديل. تأكد أن 'من' أصغر من 'إلى'."
                  : "Tap a day to edit. Make sure “from” is earlier than “to”."}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={saving}
                onClick={applyTemplate6Days}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-900"
              >
                {isArabic ? "قالب 6 أيام" : "6-day template"}
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={closeSaturday}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-900"
              >
                {isArabic ? "إغلاق السبت" : "Close Saturday"}
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={openAll}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-900"
              >
                {isArabic ? "فتح الكل" : "Open all"}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {loadingWeekly ? (
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((d) => {
                const v = draft[d.key];
                const closed = v === null;
                const err = errors[d.key];
                const expanded = expandedDay === d.key;

                return (
                  <div
                    key={d.key}
                    className={`rounded-2xl border bg-white overflow-hidden ${
                      err ? "border-rose-300" : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(d.key)}
                      className="w-full text-right p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50"
                    >
                      <div className="flex flex-col items-start">
                        <div className="font-black text-slate-900">{d.ar}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {closed ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-rose-400" />
                              {isArabic ? "مغلق" : "Closed"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              {formatRange(v)}
                            </span>
                          )}
                        </div>
                        {err ? (
                          <div className="mt-1 text-xs font-bold text-rose-700">
                            {err}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {closed ? (
                          <Pill tone="danger">
                            {isArabic ? "مغلق" : "Closed"}
                          </Pill>
                        ) : (
                          <Pill tone="success">
                            {isArabic ? "مفتوح" : "Open"}
                          </Pill>
                        )}
                        <span className="text-slate-400 font-black">
                          {expanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-3 sm:px-4 pb-4">
                        <div className="pt-2 flex items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-700">
                            <input
                              type="checkbox"
                              checked={!closed}
                              onChange={(e) =>
                                setDayClosed(d.key, !e.target.checked)
                              }
                            />
                            {isArabic ? "مفتوح" : "Open"}
                          </label>

                          <Button
                            type="button"
                            disabled={closed}
                            onClick={() => applyDayToAllOpen(d.key)}
                            className={`border ${
                              closed
                                ? "bg-slate-100 text-slate-400 border-slate-200"
                                : "bg-white hover:bg-slate-50 text-slate-900 border-slate-200"
                            }`}
                          >
                            {isArabic
                              ? "تطبيق للأيام المفتوحة"
                              : "Apply to open days"}
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-600">
                              {isArabic ? "من" : "From"}
                            </span>
                            <input
                              type="time"
                              step="1800"
                              disabled={closed}
                              value={closed ? "" : v.from}
                              onChange={(e) =>
                                setDayField(d.key, "from", e.target.value)
                              }
                              className={`px-3 py-2 rounded-xl border text-sm font-extrabold ${
                                closed
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                  : err
                                    ? "bg-white border-rose-300 text-slate-900"
                                    : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-600">
                              {isArabic ? "إلى" : "To"}
                            </span>
                            <input
                              type="time"
                              step="1800"
                              disabled={closed}
                              value={closed ? "" : v.to}
                              onChange={(e) =>
                                setDayField(d.key, "to", e.target.value)
                              }
                              className={`px-3 py-2 rounded-xl border text-sm font-extrabold ${
                                closed
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                  : err
                                    ? "bg-white border-rose-300 text-slate-900"
                                    : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {msg && (
            <div className="mt-4 text-sm font-extrabold text-slate-900 bg-amber-50 border border-amber-200 rounded-2xl p-3">
              {msg}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      {StickyBar}
    </div>
  );
}
