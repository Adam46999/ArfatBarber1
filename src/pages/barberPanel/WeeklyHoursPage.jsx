// src/pages/barberPanel/WeeklyHoursPage.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
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
    const date = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);

    return date.toLocaleString();
  } catch {
    return null;
  }
}

export default function WeeklyHoursPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const isArabic = String(i18n.language || "")
    .toLowerCase()
    .startsWith("ar");

  const rtl = isRtlLang(i18n.language);

  const [loading, setLoading] = useState(true);

  const [weekly, setWeekly] = useState(() =>
    normalizeWeekly(barberDefaultWeeklyHours),
  );

  const [updatedAt, setUpdatedAt] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);

  /**
   * تحميل الجدول الحقيقي من Firebase.
   *
   * إنشاء الافتراضي يحصل فقط من صفحة إدارة الحلاق،
   * وفقط إذا لم يكن هناك جدول محفوظ أصلًا.
   */
  const loadWeeklyHours = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const ensured = await ensureDefaultWeeklyHours(barberDefaultWeeklyHours);

      const documentData = await getWeeklyHoursDoc();

      const savedWeekly = documentData?.weekly ?? ensured?.weekly;

      if (!savedWeekly) {
        throw new Error("Weekly hours data is missing.");
      }

      setWeekly(normalizeWeekly(savedWeekly));
      setUpdatedAt(documentData?.updatedAt ?? new Date());
    } catch (error) {
      console.error("Weekly hours loading error:", error);

      /**
       * مهم:
       * لا نستبدل الحالة الحالية بالساعات الافتراضية عند الخطأ.
       * نبقي آخر نسخة ظاهرة بدل إظهار جدول قديم أو خاطئ.
       */
      setLoadError(
        isArabic
          ? "تعذّر تحميل ساعات العمل. لم يتم تغيير الساعات المحفوظة."
          : "Could not load working hours. Saved hours were not changed.",
      );
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    loadWeeklyHours();
  }, [loadWeeklyHours]);

  const updatedText = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt]);

  /**
   * يتم استدعاؤها من المحرر بعد نجاح Firebase بالحفظ.
   *
   * savedWeekly هي النسخة التي أكد Firebase حفظها،
   * لذلك نثبتها فورًا في الصفحة الأم.
   */
  const handleEditorSaved = useCallback((savedWeekly) => {
    const confirmedWeekly = normalizeWeekly(savedWeekly);

    setWeekly(confirmedWeekly);
    setUpdatedAt(new Date());
    setDirty(false);
    setLoadError("");
  }, []);

  const onBackToBarber = () => {
    if (editMode && dirty) {
      const confirmed = window.confirm(
        isArabic
          ? "لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟"
          : "You have unsaved changes. Leave without saving?",
      );

      if (!confirmed) return;
    }

    navigate("/barber");
  };

  const onResetToDefault = async () => {
    if (loading) return;

    const confirmed = window.confirm(
      isArabic
        ? "سيتم إرجاع جميع ساعات الأسبوع للوضع الافتراضي. هل أنت متأكد؟"
        : "All weekly hours will be reset to default. Continue?",
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setLoadError("");

      /**
       * نعتمد نتيجة عملية الحفظ نفسها،
       * ولا نعمل قراءة ثانية قد ترجع نسخة قديمة من Cache.
       */
      const result = await resetWeeklyHoursToDefault(barberDefaultWeeklyHours);

      const confirmedWeekly = normalizeWeekly(
        result?.weekly ?? barberDefaultWeeklyHours,
      );

      setWeekly(confirmedWeekly);
      setUpdatedAt(new Date());
      setDirty(false);
    } catch (error) {
      console.error("Weekly hours reset error:", error);

      window.alert(
        isArabic
          ? "فشل إرجاع الساعات. لم يتم تغيير الجدول الحالي."
          : "Reset failed. The current schedule was not changed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onToggleEditMode = () => {
    /**
     * الدخول إلى وضع التعديل.
     */
    if (!editMode) {
      setEditMode(true);
      setDirty(false);
      return;
    }

    /**
     * الخروج من وضع التعديل.
     */
    if (dirty) {
      const confirmed = window.confirm(
        isArabic
          ? "لديك تغييرات غير محفوظة. هل تريد إلغاءها والخروج؟"
          : "You have unsaved changes. Discard them and leave?",
      );

      if (!confirmed) return;
    }

    setEditMode(false);
    setDirty(false);

    /**
     * لا نعيد التحميل هنا.
     *
     * المحرر أرسل لنا النسخة المؤكدة بعد الحفظ،
     * وإعادة التحميل هنا كانت قد تعيد نسخة قديمة أو Cached.
     */
  };

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f8f8f8] px-4 pt-4 pb-6"
    >
      <div className="max-w-xl mx-auto pt-24">
        {/* الشريط العلوي */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToBarber}
              className="h-11 w-11 shrink-0 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition font-black"
              aria-label={isArabic ? "رجوع" : "Back"}
              title={isArabic ? "رجوع" : "Back"}
            >
              {rtl ? "→" : "←"}
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-lg font-black text-slate-900">
                {isArabic ? "ساعات العمل" : "Working hours"}
              </div>

              <div className="text-xs font-black text-slate-500 mt-0.5 truncate">
                {updatedText
                  ? isArabic
                    ? `آخر تعديل: ${updatedText}`
                    : `Last edit: ${updatedText}`
                  : "—"}
              </div>
            </div>

            <button
              type="button"
              onClick={onResetToDefault}
              disabled={loading}
              className="h-11 px-4 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isArabic ? "افتراضي" : "Default"}
            </button>

            <button
              type="button"
              onClick={onToggleEditMode}
              disabled={loading}
              className={[
                "h-11 px-4 rounded-2xl text-sm font-black transition",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                editMode
                  ? "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"
                  : "bg-slate-900 text-white hover:bg-slate-800",
              ].join(" ")}
            >
              {editMode
                ? isArabic
                  ? "إلغاء"
                  : "Cancel"
                : isArabic
                  ? "تعديل"
                  : "Edit"}
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 leading-5">
            ℹ️{" "}
            {isArabic
              ? editMode
                ? "عدّل الأيام والساعات، ثم اضغط حفظ من الشريط السفلي."
                : "عرض ساعات الأسبوع. اضغط تعديل للتغيير."
              : editMode
                ? "Change the days and hours, then press Save in the bottom bar."
                : "Viewing weekly hours. Press Edit to change."}
          </div>

          {loadError ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-800 leading-5">
              {loadError}

              <button
                type="button"
                onClick={loadWeeklyHours}
                disabled={loading}
                className="block mt-2 underline underline-offset-2 disabled:opacity-60"
              >
                {isArabic ? "إعادة المحاولة" : "Try again"}
              </button>
            </div>
          ) : null}
        </div>

        {/* المحتوى */}
        <div className="mt-10">
          {!editMode ? (
            <WeeklyHoursReadOnly
              weekly={weekly}
              isArabic={isArabic}
              loading={loading}
              updatedText={updatedText}
              onEdit={() => {
                setEditMode(true);
                setDirty(false);
              }}
              onResetToDefault={onResetToDefault}
              showHeader={false}
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
                    ? "أغلق اليوم أو افتحه، وعدّل وقت البداية والنهاية، ثم احفظ."
                    : "Open or close each day, adjust the start and end times, then save."}
                </div>
              </div>

              <div className="p-4">
                <WeeklyHoursEditorMobile
                  loading={loading}
                  initialWeekly={weekly}
                  onDirtyChange={setDirty}
                  onSaved={handleEditorSaved}
                  isArabic={isArabic}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
