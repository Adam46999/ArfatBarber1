// src/pages/barberPanel/WeeklyHoursPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import barberDefaultWeeklyHours from "../../constants/barberDefaultWeeklyHours";
import WeeklyHoursReadOnly from "./components/WeeklyHoursReadOnly";
import WeeklyHoursEditorMobile from "./components/WeeklyHoursEditorMobile";
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

  // ✅ Inline Edit mode (بدون مودال)
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);

  const reloadFromServer = useCallback(async () => {
    try {
      setLoading(true);
      const ensured = await ensureDefaultWeeklyHours(barberDefaultWeeklyHours);
      const docData = await getWeeklyHoursDoc();

      const srcWeekly =
        docData?.weekly || ensured?.weekly || barberDefaultWeeklyHours;

      setWeekly(normalizeWeekly(srcWeekly));
      setUpdatedAt(docData?.updatedAt || null);
    } catch (e) {
      console.error(e);
      setWeekly(normalizeWeekly(barberDefaultWeeklyHours));
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
          docData?.weekly || ensured?.weekly || barberDefaultWeeklyHours;

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
  const onBackToBarber = async () => {
    if (editMode && dirty) {
      const ok = window.confirm(
        isArabic
          ? "لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟"
          : "You have unsaved changes. Leave without saving?",
      );
      if (!ok) return;
    }
    nav("/barber"); // عدّل المسار إذا عندك مختلف
  };

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

  const onToggleEditMode = async () => {
    // entering edit
    if (!editMode) {
      setEditMode(true);
      setDirty(false);
      return;
    }

    // leaving edit
    if (dirty) {
      const ok = window.confirm(
        isArabic
          ? "لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟"
          : "You have unsaved changes. Leave without saving?",
      );
      if (!ok) return;
    }

    setEditMode(false);
    setDirty(false);

    // ✅ Refresh بعد الخروج حتى يتحدث updatedAt + weekly في حال تم حفظ من داخل المحرر
    await reloadFromServer();
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

            {/* Primary: Edit / Done */}
            <button
              onClick={onToggleEditMode}
              disabled={loading}
              className={[
                "h-11 px-4 rounded-2xl text-sm font-black transition disabled:opacity-60",
                editMode
                  ? "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"
                  : "bg-slate-900 text-white hover:bg-slate-800",
              ].join(" ")}
            >
              {editMode
                ? isArabic
                  ? "تم"
                  : "Done"
                : isArabic
                  ? "تعديل"
                  : "Edit"}
            </button>
          </div>

          {/* Tiny helper line */}
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 leading-5">
            ℹ️{" "}
            {isArabic
              ? editMode
                ? "التعديل يتم داخل نفس الصفحة. لن يُطبّق أي شيء إلا بعد الضغط على حفظ."
                : "عرض ساعات الأسبوع. اضغط تعديل للتغيير."
              : editMode
                ? "Editing inline. Nothing applies unless you press Save."
                : "Viewing weekly hours. Press Edit to change."}
          </div>
        </div>

        {/* Content */}
        <div className="mt-10">
          {!editMode ? (
            <WeeklyHoursReadOnly
              weekly={weekly}
              isArabic={isArabic}
              loading={loading}
              updatedText={updatedText}
              onEdit={() => setEditMode(true)}
              onResetToDefault={onResetToDefault}
              showHeader={false} // ✅ لا تكرار للهيدر
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-white">
                <div className="text-lg font-black text-slate-900">
                  {isArabic
                    ? "تعديل ساعات العمل الأسبوعية"
                    : "Edit weekly hours"}
                </div>
                <div className="text-xs font-black text-slate-500 mt-1">
                  {isArabic
                    ? "افتح/أغلق الأيام وعدّل From/To. احفظ من الشريط السفلي."
                    : "Open/close days and adjust From/To. Save from the bottom bar."}
                </div>
              </div>

              <div className="p-4">
                <WeeklyHoursEditorMobile
                  loading={loading}
                  initialWeekly={weekly}
                  onDirtyChange={setDirty}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
