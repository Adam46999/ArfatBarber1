// src/pages/barberPanel/BarberPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";

// workingHours (نفس اللي عند الزبون)
import workingHours from "../../components/booking/workingHours";

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

  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  const [selectedDate, setSelectedDate] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // نطاق تطبيق extraSlots
  const [applyMode, setApplyMode] = useState("THIS_DATE"); // THIS_DATE | SAME_WEEKDAY_UNTIL | EVERY_DAY_UNTIL
  const [applyUntil, setApplyUntil] = useState("");

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
      timer = setTimeout(() => {
        localStorage.removeItem("barberUser");
        alert("⚠️ تم تسجيل الخروج بسبب عدم النشاط لمدة ساعتين.");
        navigate("/login");
      }, 2 * 60 * 60 * 1000);
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

  // ====== times grid: workingHours + extraSlots (مصدر واحد للحقيقة) ======
  const timesForBarberGrid = useMemo(() => {
    if (!selectedDate) return [];
    const weekday = getWeekdayNameEN(selectedDate);
    const hours = workingHours?.[weekday] || null;
    if (!hours?.from || !hours?.to) return [];
    const base = generateSlots30Min(hours.from, hours.to);
    return applyExtraSlots(base, extraSlots);
  }, [selectedDate, extraSlots]);

  const isToday = selectedDate && selectedDate === todayYMD();

  const gridTimesFiltered = useMemo(() => {
    if (!timesForBarberGrid.length) return [];
    if (!isToday) return timesForBarberGrid;
    const now = new Date();
    return timesForBarberGrid.filter(
      (time) => new Date(`${selectedDate}T${time}:00`) > now
    );
  }, [timesForBarberGrid, isToday, selectedDate]);

  const dayIsClosedByHours = useMemo(() => {
    if (!selectedDate) return false;
    const weekday = getWeekdayNameEN(selectedDate);
    const hours = workingHours?.[weekday] || null;
    return !hours?.from || !hours?.to;
  }, [selectedDate]);

  return (
    <div className={`min-h-screen bg-gray-100 p-6 ${fontClass}`} dir="rtl">
      <div className="h-16" />

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-white px-8 py-6 border-b">
          <h1 className="text-3xl font-semibold text-gray-800">
            إدارة الساعات
          </h1>

          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => navigate("/admin-bookings")}
              className="text-blue-600 hover:underline transition-colors"
            >
              لوحة الحجوزات
            </button>

            <Link
              to="/blocked-phones"
              className="text-yellow-700 hover:underline transition-colors"
            >
              الأرقام المحظورة
            </Link>

            <button
              onClick={() => {
                if (window.confirm("هل أنت متأكد أنك تريد تسجيل الخروج؟")) {
                  localStorage.removeItem("barberUser");
                  navigate("/login");
                }
              }}
              className="text-red-600 hover:underline transition-colors"
            >
              تسجيل الخروج
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="text-green-700 hover:underline transition-colors"
            >
              الإحصائيات
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="p-8">
          <label className="block mb-3 text-lg font-medium text-gray-700">
            اختر التاريخ
          </label>

          <DateDropdown
            selectedDate={selectedDate}
            onChange={setSelectedDate}
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gold transition mb-4"
            min={new Date().toISOString().split("T")[0]}
          />

          {selectedDate && (
            <div className="flex items-center justify-between mb-4">
              <span>حالة اليوم:</span>
              <button
                onClick={toggleDay}
                disabled={loadingBlock}
                className={`px-4 py-2 rounded text-white font-semibold transition ${
                  isDayBlocked
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {loadingBlock
                  ? "جاري..."
                  : isDayBlocked
                  ? "تفعيل اليوم"
                  : "تعطيل اليوم"}
              </button>
            </div>
          )}

          {!selectedDate && (
            <p className="mt-2 text-sm text-gray-500">
              يمكنك استخدام القائمة أو التقويم لاختيار أي تاريخ.
            </p>
          )}

          {selectedDate && dayIsClosedByHours && (
            <p className="mt-3 text-sm text-red-600 font-medium">
              هذا اليوم مغلق
            </p>
          )}
        </div>

        {/* Times */}
        {selectedDate && !dayIsClosedByHours && !isDayBlocked && (
          <div className="p-8 pt-4 border-t bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              الأوقات (مطابقة للزبون):
            </h2>

            <TimesGrid
              times={gridTimesFiltered}
              selectedDate={selectedDate}
              bookings={bookings}
              blockedTimes={blockedTimes}
              selectedTimes={selectedTimes}
              onToggleTime={handleToggleTime}
            />

            {selectedTimes.length > 0 ? (
              <button
                onClick={handleApplyBlock}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {t("remove_selected_times") ||
                  "تطبيق الحظر على الساعات المحددة"}
              </button>
            ) : (
              <p className="text-sm text-gray-500">
                اختر ساعة أو أكثر ثم اضغط لحظرها.
              </p>
            )}
          </div>
        )}

        {selectedDate && isDayBlocked && (
          <div className="p-8 pt-4 border-t bg-yellow-50 text-center text-red-600 font-semibold text-lg">
            تم تعطيل هذا اليوم بالكامل. لا يمكن تعديل أو حظر الساعات حتى يتم
            تفعيله من جديد.
          </div>
        )}

        {/* Extra Slots */}
        {selectedDate && !dayIsClosedByHours && !isDayBlocked && (
          <div className="px-8 pb-8">
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
          <div className="p-4 bg-green-100 border border-green-300 text-green-800 text-center font-medium">
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
