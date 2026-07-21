// src/pages/barberPanel/BarberPanel.jsx

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link, useLocation } from "react-router-dom";

import HeroNoteCard from "./components/HeroNoteCard";

// Firestore weekly hours (SYNC بين الزبون والحلاق)
import useWeeklyWorkingHours from "../../hooks/useWeeklyWorkingHours";

// utils slots
import { generateSlots30Min, applyExtraSlots } from "../../utils/slots";
import { todayYMD, getWeekdayNameEN } from "./utils/dates";

// hooks
import useBookingsLive from "./hooks/useBookingsLive";
import useBlockedDay from "./hooks/useBlockedDay";
import useBlockedTimes from "./hooks/useBlockedTimes";
import useLimitOnePerDaySetting from "./hooks/useLimitOnePerDaySetting";
import useSlotExtrasLive from "./hooks/useSlotExtrasLive";

// components
import DateDropdown from "./components/DateDropdown";
import TimesGrid from "./components/TimesGrid";
import ExtraSlotsCard from "./components/ExtraSlotsCard";
import RecentBookingsCard from "./components/RecentBookingsCard";

function timeToMinutes(time) {
  if (!time) return null;

  const [hours, minutes] = String(time).split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export default function BarberPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  // نبدأ على اليوم مباشرة لتكون الصفحة مفيدة من أول لحظة
  const [selectedDate, setSelectedDate] = useState(() => todayYMD());
  const [statusMessage, setStatusMessage] = useState("");

  // التنبيه المفتوح في Bottom Sheet
  const [activeAlert, setActiveAlert] = useState(null);

  // نطاق تطبيق extraSlots
  const [applyMode, setApplyMode] = useState("THIS_DATE");
  const [applyUntil, setApplyUntil] = useState("");

  // weekly hours live
  const {
    weeklyHours,
    loading: loadingWeekly,
    error: weeklyHoursError,
    invalidDays: weeklyHoursInvalidDays,
    isStale: weeklyHoursIsStale,
    retry: retryWeeklyHours,
  } = useWeeklyWorkingHours({
    live: true,
  });

  /**
   * لا نستخدم ساعات افتراضية أثناء التحميل أو عند فشل أول قراءة.
   * weeklyHours تبقى null إلى أن تصل نسخة مؤكدة من Firestore،
   * أو يتأكد الـHook أن المستند غير موجود فعلًا.
   */
  const workingHours = weeklyHours;
  const weeklyHoursReady = workingHours !== null;

  // bookings live
  const { bookings, activeBookings, recentBookings } = useBookingsLive();

  // day block
  const { isDayBlocked, loadingBlock, toggleDay } = useBlockedDay(selectedDate);

  // blocked times
  const { blockedTimes, selectedTimes, handleToggleTime, handleApplyBlock } =
    useBlockedTimes({
      selectedDate,
      bookings,
      setStatusMessage,
    });

  // booking settings
  const {
    limitOnePerDay,
    loadingSettings,
    savingSettings,
    toggleLimitOnePerDay,
  } = useLimitOnePerDaySetting();

  // slotExtras live
  const { extraSlots, loadingExtras, savingExtras, applyExtraSlotsChange } =
    useSlotExtrasLive({
      selectedDate,
      workingHours,
      activeBookings,
    });

  // ====== auto logout ======
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(
        () => {
          localStorage.removeItem("barberUser");
          alert("⚠️ تم تسجيل الخروج بسبب عدم النشاط لمدة ساعتين.");
          navigate("/login");
        },
        2 * 60 * 60 * 1000,
      );
    };

    resetTimer();

    const handleActivity = () => resetTimer();

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [navigate]);

  // ====== times grid: workingHours + extraSlots ======
  const timesForBarberGrid = useMemo(() => {
    if (!selectedDate || !weeklyHoursReady) {
      return [];
    }

    const weekday = getWeekdayNameEN(selectedDate);
    const hours = workingHours?.[weekday] || null;

    if (!hours?.from || !hours?.to) {
      return [];
    }

    const base = generateSlots30Min(hours.from, hours.to);

    return applyExtraSlots(base, extraSlots);
  }, [selectedDate, extraSlots, workingHours, weeklyHoursReady]);

  const isToday = selectedDate === todayYMD();

  const gridTimesFiltered = useMemo(() => {
    if (!timesForBarberGrid.length) {
      return [];
    }

    if (!isToday) {
      return timesForBarberGrid;
    }

    const now = new Date();

    return timesForBarberGrid.filter(
      (time) => new Date(`${selectedDate}T${time}:00`) > now,
    );
  }, [timesForBarberGrid, isToday, selectedDate]);

  const dayIsClosedByHours = useMemo(() => {
    if (!selectedDate || !weeklyHoursReady) {
      return false;
    }

    const weekday = getWeekdayNameEN(selectedDate);
    const hours = workingHours?.[weekday] || null;

    return !hours?.from || !hours?.to;
  }, [selectedDate, workingHours, weeklyHoursReady]);

  // =========================================================
  // ملخص اليوم / التاريخ المحدد
  // =========================================================

  const selectedDayBookings = useMemo(
    () =>
      activeBookings.filter((booking) => booking.selectedDate === selectedDate),
    [activeBookings, selectedDate],
  );

  const completedBookingsCount = useMemo(() => {
    const now = new Date();

    return selectedDayBookings.filter((booking) => {
      if (!booking.selectedDate || !booking.selectedTime) {
        return false;
      }

      const bookingDate = new Date(
        `${booking.selectedDate}T${booking.selectedTime}:00`,
      );

      return bookingDate < now;
    }).length;
  }, [selectedDayBookings]);

  const remainingBookingsCount = useMemo(
    () => selectedDayBookings.length - completedBookingsCount,
    [selectedDayBookings, completedBookingsCount],
  );

  const freeSlotsCount = useMemo(() => {
    if (
      !selectedDate ||
      !weeklyHoursReady ||
      dayIsClosedByHours ||
      isDayBlocked
    ) {
      return 0;
    }

    return gridTimesFiltered.filter((time) => {
      const booked = activeBookings.some(
        (booking) =>
          booking.selectedDate === selectedDate &&
          booking.selectedTime === time,
      );

      const blocked = blockedTimes.includes(time);

      return !booked && !blocked;
    }).length;
  }, [
    selectedDate,
    weeklyHoursReady,
    dayIsClosedByHours,
    isDayBlocked,
    gridTimesFiltered,
    activeBookings,
    blockedTimes,
  ]);

  // =========================================================
  // التنبيهات الذكية
  // الأولوية:
  // 1) ساعات محظورة / أدوار إضافية غير معتادة
  // 2) اليوم شبه ممتلئ
  // 3) فراغ طويل بين الحجوزات
  // =========================================================

  const smartAlerts = useMemo(() => {
    if (!selectedDate || !weeklyHoursReady) {
      return [];
    }

    const alerts = [];

    // 1. تغييرات تشغيلية غير معتادة
    if (blockedTimes.length >= 3 || Math.abs(Number(extraSlots) || 0) >= 2) {
      const details = [];

      if (blockedTimes.length >= 3) {
        details.push(
          `الساعات المحظورة: ${blockedTimes.slice().sort().join("، ")}`,
        );
      }

      if ((Number(extraSlots) || 0) > 0) {
        details.push(`تمت إضافة ${extraSlots} أدوار إضافية في نهاية اليوم.`);
      }

      if ((Number(extraSlots) || 0) < 0) {
        details.push(`تم تقليل ${Math.abs(extraSlots)} أدوار من نهاية اليوم.`);
      }

      alerts.push({
        id: "operational",
        icon: "⚠️",
        text:
          blockedTimes.length >= 3
            ? `${blockedTimes.length} ساعات محظورة اليوم`
            : "تعديل ملحوظ بعدد الأدوار",
        title: "تغييرات مهمة على أوقات اليوم",
        reason:
          "ظهر هذا التنبيه لأن اليوم يحتوي على عدد ملحوظ من الساعات المحظورة أو تعديلات إضافية على عدد الأدوار.",
        details,
      });
    }

    // 2. اليوم شبه ممتلئ
    if (
      !dayIsClosedByHours &&
      !isDayBlocked &&
      gridTimesFiltered.length > 0 &&
      freeSlotsCount <= 2
    ) {
      alerts.push({
        id: "occupancy",
        icon: freeSlotsCount === 0 ? "🔴" : "🟠",
        text:
          freeSlotsCount === 0
            ? "لا توجد أوقات متاحة"
            : `بقي ${freeSlotsCount} أوقات فقط`,
        title: freeSlotsCount === 0 ? "اليوم ممتلئ" : "اليوم شبه ممتلئ",
        reason:
          freeSlotsCount === 0
            ? "لا يوجد حاليًا أي وقت متاح للحجز ضمن الأوقات المتبقية لهذا اليوم."
            : "عدد الأوقات المتاحة المتبقية أصبح قليلًا.",
        details: [
          `الحجوزات المتبقية: ${remainingBookingsCount}`,
          `الأوقات المتاحة: ${freeSlotsCount}`,
        ],
      });
    }

    // 3. فراغات طويلة بين الحجوزات القادمة
    const upcomingSorted = selectedDayBookings
      .filter((booking) => {
        if (!booking.selectedDate || !booking.selectedTime) {
          return false;
        }

        return (
          new Date(`${booking.selectedDate}T${booking.selectedTime}:00`) >=
          new Date()
        );
      })
      .slice()
      .sort(
        (a, b) =>
          (timeToMinutes(a.selectedTime) || 0) -
          (timeToMinutes(b.selectedTime) || 0),
      );

    const longGaps = [];

    for (let index = 0; index < upcomingSorted.length - 1; index += 1) {
      const current = upcomingSorted[index];
      const next = upcomingSorted[index + 1];

      const currentMinutes = timeToMinutes(current.selectedTime);
      const nextMinutes = timeToMinutes(next.selectedTime);

      if (currentMinutes === null || nextMinutes === null) {
        continue;
      }

      // الدور في هذا المشروع 30 دقيقة
      const freeGapMinutes = nextMinutes - currentMinutes - 30;

      if (freeGapMinutes >= 90) {
        longGaps.push(
          `بين ${current.selectedTime} و${next.selectedTime}: حوالي ${freeGapMinutes} دقيقة فراغ`,
        );
      }
    }

    if (longGaps.length > 0) {
      alerts.push({
        id: "gaps",
        icon: "🕒",
        text:
          longGaps.length === 1
            ? "يوجد فراغ طويل بين حجزين"
            : `يوجد ${longGaps.length} فراغات طويلة`,
        title: "فراغات بين الحجوزات",
        reason:
          "ظهر هذا التنبيه لأن جدول الحجوزات يحتوي على فترة طويلة نسبيًا بدون حجوزات.",
        details: longGaps,
      });
    }

    return alerts;
  }, [
    selectedDate,
    weeklyHoursReady,
    blockedTimes,
    extraSlots,
    dayIsClosedByHours,
    isDayBlocked,
    gridTimesFiltered,
    freeSlotsCount,
    remainingBookingsCount,
    selectedDayBookings,
  ]);

  // ====== Header Buttons ======
  const isActive = (to) =>
    pathname === to || (to !== "/" && pathname.startsWith(`${to}/`));

  const navBtnClass = (active, tone = "normal") => {
    const base =
      "px-4 py-2 rounded-full text-sm font-black transition border whitespace-nowrap";

    if (tone === "danger") {
      return [
        base,
        active
          ? "bg-rose-600 text-white border-rose-600 shadow"
          : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50",
      ].join(" ");
    }

    return [
      base,
      active
        ? "bg-emerald-600 text-white border-emerald-600 shadow"
        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50",
    ].join(" ");
  };

  const handleLogout = () => {
    if (window.confirm("هل أنت متأكد أنك تريد تسجيل الخروج؟")) {
      localStorage.removeItem("barberUser");
      navigate("/login");
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-100 p-3 sm:p-6 ${fontClass}`}
      dir="rtl"
    >
      <div className="h-12 sm:h-16" />

      {/* =====================================================
          الجزء الرئيسي
      ====================================================== */}

      <div className="max-w-3xl mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                إدارة الساعات
              </h1>

              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                إدارة يومك بسرعة ووضوح.
              </p>
            </div>

            <div className="pt-1 text-left text-[11px] font-bold">
              {loadingWeekly && !weeklyHoursReady ? (
                <span className="text-sky-600">
                  جاري مزامنة ساعات الأسبوع...
                </span>
              ) : weeklyHoursError ? (
                <span
                  className={
                    weeklyHoursReady ? "text-amber-600" : "text-rose-600"
                  }
                >
                  المزامنة تحتاج مراجعة
                </span>
              ) : (
                <span className="text-emerald-600">تمت المزامنة</span>
              )}
            </div>
          </div>

          {/* أزرار الإدارة */}
          <div className="mt-4 -mx-1 px-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => navigate("/admin-bookings")}
                className={navBtnClass(isActive("/admin-bookings"))}
              >
                لوحة الحجوزات
              </button>

              <button
                onClick={() => navigate("/barber/weekly-hours")}
                className={navBtnClass(isActive("/barber/weekly-hours"))}
              >
                ساعات العمل الأسبوعية
              </button>

              <button
                onClick={() => navigate("/barber/reviews")}
                className={navBtnClass(isActive("/barber/reviews"))}
              >
                إدارة التقييمات
              </button>

              <Link
                to="/blocked-phones"
                className={navBtnClass(isActive("/blocked-phones"))}
              >
                الأرقام المحظورة
              </Link>

              <button
                onClick={() => navigate("/dashboard")}
                className={navBtnClass(isActive("/dashboard"))}
              >
                الإحصائيات
              </button>

              <button
                onClick={handleLogout}
                className={navBtnClass(false, "danger")}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* حالة مزامنة ساعات الأسبوع */}
        {loadingWeekly && !weeklyHoursReady && (
          <div className="border-b border-sky-200 bg-sky-50 px-4 py-4 sm:px-7">
            <div className="text-sm font-black text-sky-800">
              جاري تحميل ساعات العمل الحقيقية من Firebase...
            </div>

            <div className="mt-1 text-xs font-semibold leading-5 text-sky-700">
              لن يتم عرض ساعات افتراضية أو فتح أي يوم قبل اكتمال القراءة.
            </div>
          </div>
        )}

        {weeklyHoursError && (
          <div
            className={[
              "border-b px-4 py-4 sm:px-7",
              weeklyHoursReady
                ? "border-amber-200 bg-amber-50"
                : "border-rose-200 bg-rose-50",
            ].join(" ")}
          >
            <div
              className={[
                "text-sm font-black",
                weeklyHoursReady ? "text-amber-900" : "text-rose-800",
              ].join(" ")}
            >
              {weeklyHoursError === "WEEKLY_HOURS_INVALID"
                ? "بعض أيام الأسبوع تحتوي ساعات غير سليمة وتم إغلاقها للحماية."
                : weeklyHoursReady
                  ? "تعذّرت المزامنة الجديدة، لذلك نعرض آخر ساعات حقيقية تم تحميلها."
                  : "تعذّر تحميل ساعات العمل من Firebase."}
            </div>

            <div
              className={[
                "mt-1 text-xs font-semibold leading-5",
                weeklyHoursReady ? "text-amber-800" : "text-rose-700",
              ].join(" ")}
            >
              {weeklyHoursError === "WEEKLY_HOURS_INVALID"
                ? `الأيام غير السليمة: ${
                    weeklyHoursInvalidDays.join("، ") || "غير محددة"
                  }.`
                : weeklyHoursIsStale
                  ? "لن نستبدل آخر نسخة حقيقية بالساعات الافتراضية."
                  : "إدارة الساعات متوقفة حتى تنجح القراءة، ولن نعرض جدولًا وهميًا."}
            </div>

            <button
              type="button"
              onClick={retryWeeklyHours}
              disabled={loadingWeekly}
              className={[
                "mt-3 rounded-xl border bg-white px-4 py-2 text-xs font-black transition",
                "disabled:cursor-not-allowed disabled:opacity-60",
                weeklyHoursReady
                  ? "border-amber-300 text-amber-900 hover:bg-amber-100"
                  : "border-rose-300 text-rose-800 hover:bg-rose-100",
              ].join(" ")}
            >
              {loadingWeekly ? "جاري المحاولة..." : "إعادة المزامنة"}
            </button>
          </div>
        )}

        {/* =====================================================
            1. ملخص اليوم
        ====================================================== */}

        <section className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {isToday ? "ملخص اليوم" : "ملخص التاريخ المحدد"}
              </h2>

              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {selectedDate}
              </p>
            </div>

            {smartAlerts.length > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-800">
                {smartAlerts.length} تنبيه
              </span>
            )}
          </div>

          {/* الأربع مربعات */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-center shadow-sm">
              <div className="text-lg font-black leading-none text-slate-900">
                {selectedDayBookings.length}
              </div>

              <div className="mt-1 text-[9px] font-bold leading-tight text-slate-500 sm:text-[10px]">
                كل الحجوزات
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-1.5 py-2 text-center">
              <div className="text-lg font-black leading-none text-amber-800">
                {remainingBookingsCount}
              </div>

              <div className="mt-1 text-[9px] font-bold leading-tight text-amber-700 sm:text-[10px]">
                المتبقي
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-center">
              <div className="text-lg font-black leading-none text-slate-700">
                {completedBookingsCount}
              </div>

              <div className="mt-1 text-[9px] font-bold leading-tight text-slate-500 sm:text-[10px]">
                المنتهي
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-1.5 py-2 text-center">
              <div className="text-lg font-black leading-none text-emerald-700">
                {weeklyHoursReady ? freeSlotsCount : "—"}
              </div>

              <div className="mt-1 text-[9px] font-bold leading-tight text-emerald-700 sm:text-[10px]">
                أوقات فاضية
              </div>
            </div>
          </div>

          {/* التنبيهات الذكية */}
          {smartAlerts.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {smartAlerts.map((alertItem) => (
                <button
                  key={alertItem.id}
                  type="button"
                  onClick={() => setActiveAlert(alertItem)}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  <span>{alertItem.icon}</span>
                  <span>{alertItem.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* حجز واحد لكل رقم / يوم */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-800">
                حجز واحد لكل رقم / يوم
              </div>

              <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                {loadingSettings
                  ? "جاري التحميل..."
                  : limitOnePerDay
                    ? "مفعّل"
                    : "غير مفعّل"}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleLimitOnePerDay}
              disabled={loadingSettings || savingSettings}
              aria-pressed={limitOnePerDay}
              aria-label="تفعيل أو تعطيل حجز واحد لكل رقم في اليوم"
              className="shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div
                className={[
                  "relative h-7 w-14 rounded-full transition-colors",
                  limitOnePerDay ? "bg-emerald-500" : "bg-slate-300",
                ].join(" ")}
              >
                <div
                  className={[
                    "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                    limitOnePerDay ? "translate-x-7" : "translate-x-0",
                  ].join(" ")}
                />
              </div>
            </button>
          </div>
        </section>

        {/* =====================================================
            2. بلوك اليوم الرئيسي
            اختيار التاريخ + حالة اليوم + شبكة الساعات
        ====================================================== */}

        <section className="bg-white">
          {/* اختيار التاريخ */}
          <div className="px-4 py-5 sm:px-7 sm:py-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-base font-black text-slate-800">
                اختر التاريخ
              </label>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                {isToday ? "اليوم" : selectedDate}
              </span>
            </div>

            <div className="space-y-3">
              <DateDropdown
                selectedDate={selectedDate}
                onChange={setSelectedDate}
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                min={todayYMD()}
              />
            </div>

            {/* =================================================
                حالة اليوم
                المنطق الداخلي هنا بقي كما كان
            ================================================== */}

            {selectedDate && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-800">
                      حالة اليوم
                    </div>

                    <div className="mt-1 text-xs font-black">
                      {!weeklyHoursReady ? (
                        <span className="text-slate-500">
                          بانتظار ساعات الأسبوع الحقيقية
                        </span>
                      ) : dayIsClosedByHours ? (
                        <span className="text-rose-600">
                          مغلق حسب ساعات الأسبوع
                        </span>
                      ) : isDayBlocked ? (
                        <span className="text-rose-600">معطّل بالكامل</span>
                      ) : (
                        <span className="text-emerald-700">مفتوح</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={toggleDay}
                    disabled={
                      loadingBlock || !weeklyHoursReady || dayIsClosedByHours
                    }
                    className={[
                      "rounded-xl px-4 py-2 font-black text-white transition",
                      !weeklyHoursReady || dayIsClosedByHours
                        ? "cursor-not-allowed bg-slate-300"
                        : isDayBlocked
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-emerald-600 hover:bg-emerald-700",
                    ].join(" ")}
                  >
                    {!weeklyHoursReady
                      ? "بانتظار المزامنة"
                      : loadingBlock
                        ? "جاري..."
                        : dayIsClosedByHours
                          ? "اليوم مغلق"
                          : isDayBlocked
                            ? "تفعيل اليوم"
                            : "تعطيل اليوم"}
                  </button>
                </div>
              </div>
            )}

            {selectedDate && !weeklyHoursReady && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-black text-slate-700">
                  إدارة هذا اليوم متوقفة مؤقتًا لحماية الجدول.
                </div>

                <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  ستظهر الأوقات تلقائيًا بعد نجاح مزامنة ساعات الأسبوع.
                </div>
              </div>
            )}

            {selectedDate && weeklyHoursReady && dayIsClosedByHours && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <div className="text-sm font-black text-rose-700">
                  هذا اليوم مغلق حسب ساعات الأسبوع.
                </div>

                <div className="mt-1 text-xs font-bold text-rose-700/80">
                  لفتحه، عدّل ساعات هذا اليوم من صفحة ساعات العمل الأسبوعية.
                </div>
              </div>
            )}
          </div>

          {/* شبكة الساعات */}
          {selectedDate &&
            weeklyHoursReady &&
            !dayIsClosedByHours &&
            !isDayBlocked && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-5 sm:px-7">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 sm:text-lg">
                      الأوقات
                    </h2>

                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      مطابقة للأوقات الظاهرة للزبون
                    </p>
                  </div>
                </div>

                <TimesGrid
                  times={gridTimesFiltered}
                  selectedDate={selectedDate}
                  bookings={bookings}
                  blockedTimes={blockedTimes}
                  selectedTimes={selectedTimes}
                  onToggleTime={handleToggleTime}
                />

                <div className="mt-2">
                  {selectedTimes.length > 0 ? (
                    <button
                      onClick={handleApplyBlock}
                      className="w-full rounded-xl bg-rose-600 py-3 font-black text-white transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                    >
                      {t("remove_selected_times") ||
                        "تطبيق الحظر على الساعات المحددة"}
                    </button>
                  ) : (
                    <p className="text-xs font-semibold text-slate-500">
                      اختر ساعة أو أكثر ثم اضغط لحظرها.
                    </p>
                  )}
                </div>
              </div>
            )}

          {selectedDate && weeklyHoursReady && isDayBlocked && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm font-black text-rose-700 sm:px-7">
              تم تعطيل هذا اليوم بالكامل. لا يمكن تعديل أو حظر الساعات حتى يتم
              تفعيله من جديد.
            </div>
          )}

          {statusMessage && (
            <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-800">
              {statusMessage}
            </div>
          )}
        </section>
      </div>

      {/* =====================================================
          3. الحجوزات الحديثة / القريبة
      ====================================================== */}

      <RecentBookingsCard recentBookings={recentBookings} />

      {/* =====================================================
          4. الساعات الإضافية
      ====================================================== */}

      {selectedDate &&
        weeklyHoursReady &&
        !dayIsClosedByHours &&
        !isDayBlocked && (
          <div className="mx-auto max-w-3xl">
            <ExtraSlotsCard
              selectedDate={selectedDate}
              extraSlots={extraSlots}
              loadingExtras={loadingExtras}
              savingExtras={savingExtras}
              applyMode={applyMode}
              setApplyMode={setApplyMode}
              applyUntil={applyUntil}
              setApplyUntil={setApplyUntil}
              onApply={(nextValue) =>
                applyExtraSlotsChange({
                  nextValue,
                  applyMode,
                  applyUntil,
                  setStatusMessage,
                  selectedDate,
                })
              }
            />
          </div>
        )}

      {/* =====================================================
          5. ملاحظة الهيرو — آخر شيء
      ====================================================== */}

      <HeroNoteCard />

      {/* =====================================================
          Bottom Sheet للتنبيهات الذكية
          معلومات فقط — بدون إجراءات
      ====================================================== */}

      {activeAlert && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35"
          onClick={() => setActiveAlert(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-3xl rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:mb-4 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={activeAlert.title}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">{activeAlert.icon}</span>

                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {activeAlert.title}
                  </h3>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {activeAlert.reason}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-500 transition hover:bg-slate-200"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            {activeAlert.details?.length > 0 && (
              <div className="mt-4 space-y-2">
                {activeAlert.details.map((detail, index) => (
                  <div
                    key={`${activeAlert.id}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700"
                  >
                    {detail}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
