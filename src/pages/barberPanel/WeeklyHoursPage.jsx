// src/pages/barberPanel/WeeklyHoursPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import barberDefaultWeeklyHours from "../../constants/barberDefaultWeeklyHours";
import WeeklyHoursReadOnly from "./components/WeeklyHoursReadOnly";
import WeeklyHoursEditSheet from "./components/WeeklyHoursEditSheet";
import { isRtlLang, normalizeWeekly } from "./utils/weeklyHoursUX";

import {
  ensureDefaultWeeklyHours,
  getWeeklyHoursDoc,
  resetWeeklyHoursToDefault,
} from "../../services/barberWeeklyHours";

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return null;
  try {
    const d = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
    return d.toLocaleString();
  } catch {
    return null;
  }
}

export default function WeeklyHoursPage() {
  const nav = useNavigate();
  const { i18n } = useTranslation();

  const isArabic = String(i18n.language || "")
    .toLowerCase()
    .startsWith("ar");
  const rtl = isRtlLang(i18n.language);

  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState(
    normalizeWeekly(barberDefaultWeeklyHours),
  );
  const [updatedAt, setUpdatedAt] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const ensured = await ensureDefaultWeeklyHours(
          barberDefaultWeeklyHours,
        );
        const docData = await getWeeklyHoursDoc();

        if (!alive) return;

        const srcWeekly =
          docData?.weekly || ensured.weekly || barberDefaultWeeklyHours;

        setWeekly(normalizeWeekly(srcWeekly));
        setUpdatedAt(docData?.updatedAt || null);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setWeekly(normalizeWeekly(barberDefaultWeeklyHours));
        setUpdatedAt(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const updatedText = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt]);

  // ✅ زر الرجوع لصفحة الحلاق
  const onBackToBarber = () => nav("/barber"); // عدّل المسار إذا عندك مختلف

  const onResetToDefault = async () => {
    const ok = window.confirm(
      isArabic
        ? "هل تريد إرجاع ساعات العمل للوضع الافتراضي؟"
        : "Reset working hours to default?",
    );
    if (!ok) return;

    try {
      setLoading(true);
      await resetWeeklyHoursToDefault(barberDefaultWeeklyHours);
      const docData = await getWeeklyHoursDoc();
      setWeekly(normalizeWeekly(docData?.weekly || barberDefaultWeeklyHours));
      setUpdatedAt(docData?.updatedAt || null);
    } catch (e) {
      console.error(e);
      alert(
        isArabic ? "فشل الإرجاع. حاول مرة أخرى." : "Reset failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f8f8f8] px-4 pt-4 pb-6"
    >
      <div className="max-w-xl mx-auto pt-24">
        {/* ✅ Premium Top Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3">
          <div className="flex items-center gap-3">
            {/* Back */}
            <button
              onClick={onBackToBarber}
              className="h-11 w-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
              aria-label={isArabic ? "رجوع" : "Back"}
              title={isArabic ? "رجوع" : "Back"}
            >
              {rtl ? "→" : "←"}
            </button>

            {/* Title */}
            <div className="flex-1">
              <div className="text-lg font-black text-slate-900">
                {isArabic ? "ساعات العمل" : "Working hours"}
              </div>
              <div className="text-xs font-black text-slate-500 mt-0.5">
                {updatedText
                  ? isArabic
                    ? `آخر تعديل: ${updatedText}`
                    : `Last edit: ${updatedText}`
                  : isArabic
                    ? "—"
                    : "—"}
              </div>
            </div>

            {/* Secondary: Default */}
            <button
              onClick={onResetToDefault}
              disabled={loading}
              className="h-11 px-4 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black hover:bg-slate-50 transition disabled:opacity-60"
            >
              {isArabic ? "افتراضي" : "Default"}
            </button>

            {/* Primary: Edit */}
            <button
              onClick={() => setEditOpen(true)}
              disabled={loading}
              className="h-11 px-4 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 transition disabled:opacity-60"
            >
              {isArabic ? "تعديل" : "Edit"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-10">
          <WeeklyHoursReadOnly
            weekly={weekly}
            isArabic={isArabic}
            loading={loading}
            updatedText={updatedText}
            onEdit={() => setEditOpen(true)}
            onResetToDefault={onResetToDefault}
            showHeader={false} // ✅ هي اللي بتحل التكرار
          />
        </div>
      </div>

      {editOpen ? (
        <WeeklyHoursEditSheet
          isArabic={isArabic}
          initialWeekly={weekly}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </div>
  );
}
