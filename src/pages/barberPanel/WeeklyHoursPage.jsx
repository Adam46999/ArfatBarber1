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
      className="min-h-screen bg-[#f5f6f7] px-3 pb-8 pt-3 sm:px-4 sm:pt-5"
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToBarber}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.97]"
            aria-label={
              isArabic
                ? "\u0631\u062c\u0648\u0639"
                : "Back"
            }
          >
            {rtl ? "?" : "?"}
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black tracking-tight text-slate-950">
              {isArabic
                ? "\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644"
                : "Working hours"}
            </h1>

            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-slate-400">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  isStale || loadError
                    ? "bg-amber-400"
                    : "bg-emerald-500",
                ].join(" ")}
              />

              <span className="truncate">
                {loading &&
                !hasConfirmedWeekly
                  ? isArabic
                    ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629..."
                    : "Syncing..."
                  : updatedText
                    ? isArabic
                      ? `\u0622\u062e\u0631 \u062a\u0639\u062f\u064a\u0644: ${updatedText}`
                      : `Last edit: ${updatedText}`
                    : isArabic
                      ? "\u0645\u0632\u0627\u0645\u0646\u0629 \u0645\u0628\u0627\u0634\u0631\u0629"
                      : "Live sync"}
              </span>
            </div>
          </div>

          {hasConfirmedWeekly ? (
            <button
              type="button"
              onClick={onToggleEditMode}
              disabled={loading}
              className={[
                "min-h-10 shrink-0 rounded-xl px-4 text-sm font-black transition",
                "disabled:cursor-not-allowed disabled:opacity-50",
                editMode
                  ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  : "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
              ].join(" ")}
            >
              {editMode
                ? isArabic
                  ? "\u0625\u0644\u063a\u0627\u0621"
                  : "Cancel"
                : isArabic
                  ? "\u062a\u0639\u062f\u064a\u0644"
                  : "Edit"}
            </button>
          ) : null}
        </div>

        {isStale ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900">
            {isArabic
              ? "\u064a\u062a\u0645 \u0639\u0631\u0636 \u0622\u062e\u0631 \u0646\u0633\u062e\u0629 \u0645\u0624\u0643\u062f\u0629\u060c \u0644\u0643\u0646 \u0642\u062f \u0644\u0627 \u062a\u0643\u0648\u0646 \u0627\u0644\u0623\u062d\u062f\u062b \u0628\u0633\u0628\u0628 \u0645\u0634\u0643\u0644\u0629 \u0627\u062a\u0635\u0627\u0644."
              : "Showing the last confirmed schedule. It may not be the newest because of a connection issue."}
          </div>
        ) : null}

        {loadError ? (
          <div
            className={[
              "mb-3 rounded-2xl border px-4 py-3 text-xs font-black leading-5",
              hasConfirmedWeekly
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-rose-200 bg-rose-50 text-rose-800",
            ].join(" ")}
          >
            {loadError}

            <button
              type="button"
              onClick={retryLiveSync}
              disabled={loading}
              className="mx-2 underline underline-offset-2 disabled:opacity-50"
            >
              {isArabic
                ? "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629"
                : "Retry"}
            </button>
          </div>
        ) : null}

        {!hasConfirmedWeekly ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

                <div className="mt-4 text-sm font-black text-slate-700">
                  {isArabic
                    ? "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644..."
                    : "Loading working hours..."}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-rose-50 p-4 text-center text-sm font-black text-rose-800">
                {isArabic
                  ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u0627\u0639\u0627\u062a \u0645\u0624\u0643\u062f\u0629 \u0644\u0639\u0631\u0636\u0647\u0627."
                  : "No confirmed hours are available."}
              </div>
            )}
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
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] sm:p-5">
            <div className="mb-5">
              <div className="text-lg font-black text-slate-950">
                {isArabic
                  ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639"
                  : "Edit week"}
              </div>

              <div className="mt-1 text-xs font-bold leading-5 text-slate-500">
                {isArabic
                  ? "\u0627\u0641\u062a\u062d \u0627\u0644\u064a\u0648\u0645 \u0627\u0644\u0630\u064a \u0628\u062f\u0643 \u062a\u0639\u062f\u0644\u0647\u060c \u0648\u063a\u064a\u0651\u0631 \u0627\u0644\u0633\u0627\u0639\u0627\u062a. \u0627\u0644\u062d\u0641\u0638 \u0628\u064a\u0638\u0647\u0631 \u0641\u0642\u0637 \u0644\u0645\u0627 \u064a\u0643\u0648\u0646 \u0641\u064a \u062a\u063a\u064a\u064a\u0631."
                  : "Open a day to edit it. Save appears only when something changed."}
              </div>
            </div>

            <WeeklyHoursEditorMobile
              loading={loading}
              initialWeekly={weekly}
              onDirtyChange={handleDirtyChange}
              onSaved={handleEditorSaved}
              isArabic={isArabic}
            />
          </div>
        )}
      </div>
    </div>
  );
}

