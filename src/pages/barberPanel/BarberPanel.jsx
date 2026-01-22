// src/pages/barberPanel/BarberPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link, useLocation } from "react-router-dom";
import NotificationTestCard from "./components/NotificationTestCard";

// ✅ fallback workingHours — إذا ما في بيانات من Firestore
import fallbackWorkingHours from "../../components/booking/workingHours";

// ✅ Firestore weekly hours (SYNC بين الزبون والحلاق)
import useWeeklyWorkingHours from "../../hooks/useWeeklyWorkingHours";

// utils slots (مصدر واحد للحقيقة)
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
import LimitOnePerDayCard from "./components/LimitOnePerDayCard";

export default function BarberPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  const [selectedDate, setSelectedDate] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // نطاق تطبيق extraSlots
  const [applyMode, setApplyMode] = useState("THIS_DATE"); // THIS_DATE | SAME_WEEKDAY_UNTIL | EVERY_DAY_UNTIL
  const [applyUntil, setApplyUntil] = useState("");

  // ✅ weekly hours live (SYNC)
  const { weeklyHours, loadingWeekly } = useWeeklyWorkingHours({ live: true });
  const workingHours = weeklyHours || fallbackWorkingHours;

  // bookings live
  const { bookings, activeBookings, recentBookings } = useBookingsLive();

  // day block
  const { isDayBlocked, loadingBlock, toggleDay } = useBlockedDay(selectedDate);

  // blocked times
  const { blockedTimes, selectedTimes, handleToggleTime, handleApplyBlock } =
    useBlockedTimes({ selectedDate, bookings, setStatusMessage });

  // settings
  const {
    limitOnePerDay,
    loadingSettings,
    savingSettings,
    toggleLimitOnePerDay,
  } = useLimitOnePerDaySetting();

  // slotExtras live (SYNC)
  const { extraSlots, loadingExtras, savingExtras, applyExtraSlotsChange } =
    useSlotExtrasLive({ selectedDate, workingHours, activeBookings });

  // ====== auto logout ======
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
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
    if (!selectedDate) return [];
    const weekday = getWeekdayNameEN(selectedDate);
    const hours = workingHours?.[weekday] || null;
    if (!hours?.from || !hours?.to) return [];
    const base = generateSlots30Min(hours.from, hours.to);
    return applyExtraSlots(base, extraSlots);
  }, [selectedDate, extraSlots, workingHours]);

  const isToday = selectedDate && selectedDate === todayYMD();

  const gridTimesFiltered = useMemo(() => {
    if (!timesForBarberGrid.length) return [];
    if (!isToday) return timesForBarberGrid;
    const now = new Date();
    return timesForBarberGrid.filter(
      (time) => new Date(`${selectedDate}T${time}:00`) > now,
    );
  }, [timesForBarberGrid, isToday, selectedDate]);

  const dayIsClosedByHours = useMemo(() => {
    if (!selectedDate) return false;
    const weekday = getWeekdayNameEN(selectedDate);
    const hours = workingHours?.[weekday] || null;
    return !hours?.from || !hours?.to;
  }, [selectedDate, workingHours]);

  // ====== Header Buttons (موبايل-أول) ======
  const isActive = (to) =>
    pathname === to || (to !== "/" && pathname.startsWith(to + "/"));

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
      className={`min-h-screen bg-gray-100 p-4 sm:p-6 ${fontClass}`}
      dir="rtl"
    >
      <div className="h-12 sm:h-16" />

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-white px-5 sm:px-8 py-5 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-800">
                إدارة الساعات
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-1">
                كل شيء واضح وسريع — اختار تاريخ واشتغل مباشرة.
              </p>
            </div>

            {/* حالة سريعة (اختياري) */}
            <div className="text-xs font-black text-gray-500">
              {loadingWeekly ? "جاري مزامنة ساعات الأسبوع..." : " "}
            </div>
          </div>

          {/* أزرار الإدارة: سكرول أفقي للموبايل */}
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
        {/* 🔔 Notification Test (Barber) */}
        <div className="px-5 sm:px-8 py-6 border-b bg-gray-50">
          <NotificationTestCard />
        </div>
        {/* Date */}
        <div className="p-5 sm:p-8">
          <label className="block mb-3 text-lg font-black text-gray-700">
            اختر التاريخ
          </label>

          {/* خلي تجربة الاختيار سهلة للموبايل */}
          <div className="space-y-3">
            <DateDropdown
              selectedDate={selectedDate}
              onChange={setSelectedDate}
            />

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {!selectedDate && (
            <p className="mt-3 text-sm text-gray-500 font-semibold">
              اختر تاريخ لتظهر لك ساعات اليوم وتعديلات الحظر والإضافات.
            </p>
          )}

          {/* حالة اليوم */}
          {selectedDate && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-gray-800">
                    حالة اليوم
                  </div>
                  <div className="text-xs font-black mt-1">
                    {dayIsClosedByHours ? (
                      <span className="text-rose-600">
                        مغلق حسب ساعات الأسبوع (عدّل من صفحة ساعات العمل
                        الأسبوعية)
                      </span>
                    ) : isDayBlocked ? (
                      <span className="text-rose-600">
                        معطّل بالكامل (تم تعطيله يدويًا)
                      </span>
                    ) : (
                      <span className="text-emerald-700">مفتوح</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={toggleDay}
                  disabled={loadingBlock || dayIsClosedByHours}
                  className={[
                    "px-4 py-2 rounded-xl text-white font-black transition",
                    dayIsClosedByHours
                      ? "bg-gray-300 cursor-not-allowed"
                      : isDayBlocked
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700",
                  ].join(" ")}
                >
                  {loadingBlock
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

          {selectedDate && dayIsClosedByHours && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-black text-rose-700">
                هذا اليوم مغلق حسب ساعات الأسبوع.
              </div>
              <div className="text-xs font-black text-rose-700/80 mt-1">
                إذا بدك تفتحه: روح على “ساعات العمل الأسبوعية” وعدّل هذا اليوم.
              </div>
            </div>
          )}
        </div>

        {/* Times */}
        {selectedDate && !dayIsClosedByHours && !isDayBlocked && (
          <div className="p-5 sm:p-8 pt-4 border-t bg-gray-50">
            <h2 className="text-xl font-black text-gray-800 mb-3">
              الأوقات (مطابقة للزبون)
            </h2>

            <TimesGrid
              times={gridTimesFiltered}
              selectedDate={selectedDate}
              bookings={bookings}
              blockedTimes={blockedTimes}
              selectedTimes={selectedTimes}
              onToggleTime={handleToggleTime}
            />

            <div className="mt-4">
              {selectedTimes.length > 0 ? (
                <button
                  onClick={handleApplyBlock}
                  className="w-full bg-rose-600 text-white py-3 rounded-xl font-black hover:bg-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  {t("remove_selected_times") ||
                    "تطبيق الحظر على الساعات المحددة"}
                </button>
              ) : (
                <p className="text-sm text-gray-500 font-semibold">
                  اختر ساعة أو أكثر ثم اضغط لحظرها.
                </p>
              )}
            </div>
          </div>
        )}

        {selectedDate && isDayBlocked && (
          <div className="p-5 sm:p-8 pt-4 border-t bg-yellow-50 text-center text-rose-700 font-black text-base">
            تم تعطيل هذا اليوم بالكامل. لا يمكن تعديل أو حظر الساعات حتى يتم
            تفعيله من جديد.
          </div>
        )}

        {/* Extra Slots */}
        {selectedDate && !dayIsClosedByHours && !isDayBlocked && (
          <div className="px-5 sm:px-8 pb-8">
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

        {statusMessage && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 text-center font-black">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Recent */}
      <RecentBookingsCard recentBookings={recentBookings} />

      {/* Limit one per day */}
      <LimitOnePerDayCard
        limitOnePerDay={limitOnePerDay}
        loadingSettings={loadingSettings}
        savingSettings={savingSettings}
        onToggle={toggleLimitOnePerDay}
      />
    </div>
  );
}
