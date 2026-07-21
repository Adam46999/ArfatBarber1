// src/pages/barberPanel/WeeklyHoursPage.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../../firebase";
import barberDefaultWeeklyHours from "../../constants/barberDefaultWeeklyHours";

import WeeklyHoursReadOnly from "./components/WeeklyHoursReadOnly";
import WeeklyHoursEditorMobile from "./components/WeeklyHoursEditorMobile";

import { isRtlLang, normalizeWeekly } from "./utils/weeklyHoursUX";

import {
  ensureDefaultWeeklyHours,
  resetWeeklyHoursToDefault,
} from "../../services/barberWeeklyHours";

const WEEKLY_HOURS_DOC = ["barberSettings", "hours"];

function cloneValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) {
    return null;
  }

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

  /**
   * null تعني:
   * لم تصل بعد نسخة مؤكدة من Firebase.
   *
   * ممنوع البدء بالساعات الافتراضية،
   * لأنها قد تظهر كأنها الساعات الحقيقية.
   */
  const [weekly, setWeekly] = useState(null);
  const weeklyRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [loadError, setLoadError] = useState("");
  const [isStale, setIsStale] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const editModeRef = useRef(false);

  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  /**
   * إذا وصلت نسخة جديدة من Firebase أثناء
   * وجود تغييرات غير محفوظة، لا نمسح تعديل الحلاق.
   *
   * نحتفظ بالنسخة مؤقتًا فقط.
   *
   * الحماية الحقيقية وقت الحفظ موجودة داخل
   * barberWeeklyHours.js من خلال Firestore Transaction.
   */
  const deferredServerWeeklyRef = useRef(null);

  const setConfirmedWeekly = useCallback((nextWeekly, nextUpdatedAt = null) => {
    const normalizedWeekly = normalizeWeekly(nextWeekly);

    const confirmedWeekly = cloneValue(normalizedWeekly);

    weeklyRef.current = confirmedWeekly;

    setWeekly(confirmedWeekly);

    if (nextUpdatedAt) {
      setUpdatedAt(nextUpdatedAt);
    }

    setIsStale(false);
  }, []);

  const handleDirtyChange = useCallback((nextDirty) => {
    const normalizedDirty = Boolean(nextDirty);

    dirtyRef.current = normalizedDirty;

    setDirty(normalizedDirty);
  }, []);

  const handleLoadFailure = useCallback(
    (error) => {
      console.error("Weekly hours live loading error:", error);

      const hasConfirmedWeekly = weeklyRef.current !== null;

      setLoading(false);
      setIsStale(hasConfirmedWeekly);

      setLoadError(
        hasConfirmedWeekly
          ? isArabic
            ? "تعذّرت المزامنة المباشرة. يتم عرض آخر ساعات حقيقية تم تحميلها، ولن نستبدلها بالساعات الافتراضية."
            : "Live sync failed. The last confirmed hours remain visible and will not be replaced by defaults."
          : isArabic
            ? "تعذّر تحميل ساعات العمل من Firebase. لم يتم عرض أي ساعات افتراضية."
            : "Could not load working hours from Firebase. No default hours were shown.",
      );
    },
    [isArabic],
  );

  /**
   * المزامنة المباشرة مع Firestore.
   *
   * الخطوات:
   *
   * 1. نتأكد أن المستند موجود.
   * 2. إذا كان غير موجود فعلًا فقط، ننشئ الافتراضي.
   * 3. نعتمد نتيجة Transaction كنسخة مؤكدة.
   * 4. نفتح onSnapshot للتحديثات التالية.
   * 5. نتجاهل Cache والكتابات المحلية المعلقة.
   */
  useEffect(() => {
    let active = true;
    let unsubscribe = null;

    const startLiveSync = async () => {
      if (weeklyRef.current === null) {
        setLoading(true);
      }

      setLoadError("");
      setIsStale(false);

      try {
        const ensured = await ensureDefaultWeeklyHours(
          barberDefaultWeeklyHours,
        );

        if (!active) {
          return;
        }

        /**
         * نتيجة Transaction مؤكدة من Firebase.
         *
         * قد تكون:
         * - الجدول الموجود أصلًا.
         * - أو الافتراضي الذي تم إنشاؤه لأن
         *   المستند لم يكن موجودًا فعلًا.
         */
        if (ensured?.weekly) {
          setConfirmedWeekly(ensured.weekly, null);

          setLoading(false);
        }

        const hoursRef = doc(db, ...WEEKLY_HOURS_DOC);

        unsubscribe = onSnapshot(
          hoursRef,

          {
            includeMetadataChanges: true,
          },

          (snapshot) => {
            if (!active) {
              return;
            }

            /**
             * لا نعتمد:
             *
             * - نسخة Cache.
             * - كتابة محلية لم يؤكدها السيرفر بعد.
             *
             * هذا يمنع التحذيرات والتحديثات الوهمية.
             */
            if (
              snapshot.metadata.fromCache ||
              snapshot.metadata.hasPendingWrites
            ) {
              return;
            }

            if (!snapshot.exists()) {
              handleLoadFailure(
                new Error("Weekly hours document does not exist."),
              );

              return;
            }

            const documentData = snapshot.data() || {};

            const savedWeekly = documentData.weekly;

            if (!savedWeekly || typeof savedWeekly !== "object") {
              handleLoadFailure(new Error("Weekly hours data is missing."));

              return;
            }

            const serverWeekly = normalizeWeekly(savedWeekly);

            const serverPayload = {
              weekly: serverWeekly,

              updatedAt: documentData.updatedAt ?? new Date(),
            };

            /**
             * الحلاق داخل التعديل ولديه تغييرات.
             *
             * لا نغيّر weekly في الصفحة،
             * حتى لا يعاد تهيئة المحرر أو تضيع تعديلاته.
             *
             * عند الحفظ، Transaction تقارن مع أحدث
             * نسخة وتقرر الدمج أو التعارض الحقيقي.
             */
            if (editModeRef.current && dirtyRef.current) {
              deferredServerWeeklyRef.current = serverPayload;

              setLoading(false);
              setIsStale(false);

              return;
            }

            deferredServerWeeklyRef.current = null;

            setConfirmedWeekly(serverPayload.weekly, serverPayload.updatedAt);

            setLoadError("");
            setLoading(false);
          },

          (error) => {
            if (!active) {
              return;
            }

            handleLoadFailure(error);
          },
        );
      } catch (error) {
        if (!active) {
          return;
        }

        handleLoadFailure(error);
      }
    };

    startLiveSync();

    return () => {
      active = false;

      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [reloadKey, handleLoadFailure, setConfirmedWeekly]);

  const updatedText = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt]);

  /**
   * يتم استدعاؤها من المحرر
   * بعد نجاح الحفظ في Firestore.
   *
   * savedWeekly هي النسخة النهائية التي
   * رجعت من Transaction بعد الدمج.
   */
  const handleEditorSaved = useCallback(
    (savedWeekly) => {
      setConfirmedWeekly(savedWeekly, new Date());

      dirtyRef.current = false;

      setDirty(false);
      setLoadError("");

      /**
       * نتيجة الحفظ نفسها تحتوي أحدث نسخة
       * مدموجة، لذلك لا نحتاج النسخة المؤجلة.
       */
      deferredServerWeeklyRef.current = null;
    },
    [setConfirmedWeekly],
  );

  const retryLiveSync = () => {
    setReloadKey((currentValue) => currentValue + 1);
  };

  const applyDeferredServerWeekly = useCallback(() => {
    const deferred = deferredServerWeeklyRef.current;

    if (!deferred?.weekly) {
      return;
    }

    setConfirmedWeekly(deferred.weekly, deferred.updatedAt);

    deferredServerWeeklyRef.current = null;

    setLoadError("");
  }, [setConfirmedWeekly]);

  const onBackToBarber = () => {
    if (editMode && dirty) {
      const confirmed = window.confirm(
        isArabic
          ? "لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟"
          : "You have unsaved changes. Leave without saving?",
      );

      if (!confirmed) {
        return;
      }
    }

    navigate("/barber");
  };

  const onResetToDefault = async () => {
    if (loading || weekly === null) {
      return;
    }

    const confirmed = window.confirm(
      isArabic
        ? "سيتم إرجاع جميع ساعات الأسبوع للوضع الافتراضي. هل أنت متأكد؟"
        : "All weekly hours will be reset to default. Continue?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      /**
       * نعتمد نتيجة Transaction نفسها،
       * ولا نقرأ بعدها نسخة قديمة من Cache.
       */
      const result = await resetWeeklyHoursToDefault(barberDefaultWeeklyHours);

      const confirmedWeekly = result?.weekly;

      if (!confirmedWeekly) {
        throw new Error("Reset did not return weekly hours.");
      }

      setConfirmedWeekly(confirmedWeekly, new Date());

      dirtyRef.current = false;

      setDirty(false);

      deferredServerWeeklyRef.current = null;
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

  const enterEditMode = () => {
    if (weekly === null) {
      return;
    }

    editModeRef.current = true;

    setEditMode(true);

    dirtyRef.current = false;

    setDirty(false);
  };

  const onToggleEditMode = () => {
    /**
     * الدخول إلى وضع التعديل.
     */
    if (!editMode) {
      enterEditMode();

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

      if (!confirmed) {
        return;
      }
    }

    editModeRef.current = false;

    setEditMode(false);

    dirtyRef.current = false;

    setDirty(false);

    /**
     * إذا وصلت نسخة جديدة من Firebase
     * أثناء التعديل ثم قرر الحلاق الإلغاء،
     * نعرض النسخة الجديدة الآن.
     */
    applyDeferredServerWeekly();
  };

  const hasConfirmedWeekly = weekly !== null;

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f8f8f8] px-4 pt-4 pb-6"
    >
      <div className="max-w-xl mx-auto pt-24">
        {/* الشريط العلوي */}
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToBarber}
              className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white font-black transition hover:bg-slate-50"
              aria-label={isArabic ? "رجوع" : "Back"}
              title={isArabic ? "رجوع" : "Back"}
            >
              {rtl ? "→" : "←"}
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-slate-900">
                {isArabic ? "ساعات العمل" : "Working hours"}
              </div>

              <div className="mt-0.5 truncate text-xs font-black text-slate-500">
                {loading && !hasConfirmedWeekly
                  ? isArabic
                    ? "جاري المزامنة مع Firebase..."
                    : "Syncing with Firebase…"
                  : updatedText
                    ? isArabic
                      ? `آخر تعديل: ${updatedText}`
                      : `Last edit: ${updatedText}`
                    : isArabic
                      ? "مزامنة مباشرة"
                      : "Live sync"}
              </div>
            </div>

            <button
              type="button"
              onClick={onResetToDefault}
              disabled={loading || !hasConfirmedWeekly}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isArabic ? "افتراضي" : "Default"}
            </button>

            <button
              type="button"
              onClick={onToggleEditMode}
              disabled={loading || !hasConfirmedWeekly}
              className={[
                "h-11 rounded-2xl px-4 text-sm font-black transition",
                "disabled:cursor-not-allowed disabled:opacity-60",

                editMode
                  ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
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

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black leading-5 text-slate-700">
            ℹ️{" "}
            {isArabic
              ? editMode
                ? "عدّل الأيام والساعات، ثم اضغط حفظ. أي تحديث يصل أثناء التعديل لن يمسح تغييراتك."
                : "هذه الساعات متصلة مباشرة مع Firebase. اضغط تعديل للتغيير."
              : editMode
                ? "Change the days and hours, then press Save. Incoming updates will not overwrite your changes."
                : "These hours are live-synced with Firebase. Press Edit to change."}
          </div>

          {isStale ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900">
              {isArabic
                ? "يتم عرض آخر نسخة حقيقية تم تحميلها، لكنها قد لا تكون الأحدث بسبب مشكلة اتصال."
                : "The last confirmed version is visible, but it may not be the newest because of a connection problem."}
            </div>
          ) : null}

          {loadError ? (
            <div
              className={[
                "mt-3 rounded-2xl border px-4 py-3 text-xs font-black leading-5",

                hasConfirmedWeekly
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              ].join(" ")}
            >
              {loadError}

              <div className="mt-2">
                <button
                  type="button"
                  onClick={retryLiveSync}
                  disabled={loading}
                  className="underline underline-offset-2 disabled:opacity-60"
                >
                  {isArabic ? "إعادة المزامنة" : "Try syncing again"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* المحتوى */}
        <div className="mt-10">
          {!hasConfirmedWeekly ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="p-5">
                {loading ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <div className="text-sm font-black text-sky-800">
                      {isArabic
                        ? "جاري تحميل ساعات العمل الحقيقية..."
                        : "Loading confirmed working hours…"}
                    </div>

                    <div className="mt-1 text-xs font-black leading-5 text-sky-700">
                      {isArabic
                        ? "لن نعرض جدولًا افتراضيًا على أنه الجدول المحفوظ."
                        : "A default schedule will not be shown as if it were saved."}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="text-sm font-black text-rose-800">
                      {isArabic
                        ? "لا توجد ساعات مؤكدة لعرضها حاليًا."
                        : "There are no confirmed hours available to display."}
                    </div>

                    <button
                      type="button"
                      onClick={retryLiveSync}
                      className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-black text-rose-800 transition hover:bg-rose-100"
                    >
                      {isArabic ? "إعادة المزامنة" : "Try syncing again"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : !editMode ? (
            <WeeklyHoursReadOnly
              weekly={weekly}
              isArabic={isArabic}
              loading={false}
              updatedText={updatedText}
              onEdit={enterEditMode}
              onResetToDefault={onResetToDefault}
              showHeader={false}
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <div className="text-lg font-black text-slate-900">
                  {isArabic
                    ? "تعديل ساعات العمل الأسبوعية"
                    : "Edit weekly hours"}
                </div>

                <div className="mt-1 text-xs font-black text-slate-500">
                  {isArabic
                    ? "أغلق اليوم أو افتحه، وعدّل وقت البداية والنهاية، ثم احفظ."
                    : "Open or close each day, adjust the start and end times, then save."}
                </div>
              </div>

              <div className="p-4">
                <WeeklyHoursEditorMobile
                  loading={loading}
                  initialWeekly={weekly}
                  onDirtyChange={handleDirtyChange}
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
