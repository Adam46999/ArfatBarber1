import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DateField from "./parts/DateField";
import TimeSelector from "./parts/TimeSelector";
import useWeeklyWorkingHours from "../../hooks/useWeeklyWorkingHours";
import useMonthAvailability from "../../hooks/useMonthAvailability";
import useAvailableTimes from "../../hooks/useAvailableTimes";
import { rescheduleBooking } from "../../services/bookingService";

export default function ReschedulePanel({ booking, bookingCode, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const { weeklyHours, loading, error } = useWeeklyWorkingHours({ live: true });
  const { summaryByDate, loading: monthLoading, ready: monthReady, error: monthError } = useMonthAvailability({ monthDate: visibleMonth, workingHours: weeklyHours, enabled: true });
  const { availableTimes, isDayBlocked, loadingTimes, timesReady, timesError } = useAvailableTimes(selectedDate, weeklyHours);

  useEffect(() => {
    if (!selectedTime || !timesReady || loadingTimes || timesError) return;
    if (!availableTimes.includes(selectedTime)) {
      setSelectedTime("");
      setNotice("الساعة التي اخترتها لم تعد متاحة. اختر ساعة أخرى.");
    }
  }, [availableTimes, loadingTimes, selectedTime, timesError, timesReady]);
  const sameAsCurrent = selectedDate === booking?.selectedDate && selectedTime === booking?.selectedTime;
  const canConfirm = Boolean(selectedDate && selectedTime) && availableTimes.includes(selectedTime) && !sameAsCurrent && !saving;

  const handleConfirm = async () => {
    if (!canConfirm || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      await rescheduleBooking({ bookingId: booking.docId, bookingCode, selectedDate, selectedTime });
      onSuccess?.({ selectedDate, selectedTime });
    } catch (error) {
      console.error("Reschedule failed:", error);
      const messages = {
        INVALID_BOOKING_CODE: "رمز التحقق غير صحيح.",
        BOOKING_NOT_FOUND: "لم نعد نجد هذا الحجز.",
        BOOKING_CANCELLED: "هذا الحجز ملغي ولا يمكن تعديله.",
        RESCHEDULE_WINDOW_CLOSED: "لا يمكن تعديل الموعد قبل أقل من 50 دقيقة من موعده.",
        SAME_BOOKING_TIME: "اختر موعدًا مختلفًا عن موعدك الحالي.",
        TIME_ALREADY_BOOKED: "هذا الموعد انحجز للتو. اختر موعدًا آخر.",
        TARGET_DAY_BLOCKED: "هذا اليوم أصبح مغلقًا. اختر يومًا آخر.",
        TARGET_DAY_CLOSED: "هذا اليوم مغلق. اختر يومًا آخر.",
        TARGET_TIME_BLOCKED: "هذه الساعة لم تعد متاحة. اختر ساعة أخرى.",
        TARGET_TIME_NOT_AVAILABLE: "هذه الساعة لم تعد متاحة. اختر ساعة أخرى.",
        PHONE_ALREADY_BOOKED_TODAY: "يوجد حجز آخر بهذا الرقم في اليوم الذي اخترته.",
        OLD_SLOT_CONFLICT: "تعذر تنفيذ التعديل بأمان.",
      };
      setSubmitError(
        (messages[error?.message] || "تعذر تغيير الموعد الآن.") +
          " موعدك الحالي لم يتغير.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <div className="mt-4 rounded-3xl border border-[#dcc98f] bg-[#fffdf8] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-slate-900">تغيير الموعد</h3>
        <button type="button" onClick={onClose}>إغلاق</button>
      </div>
      <p className="mt-3 text-sm font-bold">موعدك الحالي: {booking?.selectedDate} — {booking?.selectedTime}</p>
      <div className="mt-5">
        {loading ? <p>جارٍ تحميل التقويم...</p> : error || !weeklyHours ? <p className="text-red-600">تعذر تحميل ساعات العمل.</p> : <DateField valueYMD={selectedDate} onChangeYMD={(date) => { setSelectedDate(date); setSelectedTime(""); }} t={t} workingHours={weeklyHours} onVisibleMonthChange={setVisibleMonth} availabilityByDate={summaryByDate} availabilityReady={monthReady} availabilityLoading={monthLoading} availabilityError={monthError} />}
      </div>

      {selectedDate && loadingTimes ? <p className="mt-5 text-sm font-bold text-slate-600">جارٍ تحميل المواعيد المتاحة...</p> : null}
      {selectedDate && timesError ? <p className="mt-5 text-sm font-bold text-red-600">تعذر تحميل المواعيد الآن. حاول مرة أخرى.</p> : null}
      {selectedDate && !loadingTimes && !timesError && isDayBlocked ? <p className="mt-5 text-sm font-bold text-amber-700">لا توجد مواعيد متاحة في هذا اليوم.</p> : null}
      {selectedDate && timesReady && !loadingTimes && !timesError && !isDayBlocked ? (
        <div className="mt-5">
          <TimeSelector selectedDate={selectedDate} selectedTime={selectedTime} onSelectTime={setSelectedTime} availableTimes={availableTimes} workingHours={weeklyHours} t={t} />
        </div>
      ) : null}


      {selectedDate && selectedTime ? (
        <div className="mt-5 rounded-2xl border border-[#e2d3a7] bg-white p-4">
          <p className="text-xs font-bold text-slate-500">راجع التغيير</p>
          <div className="mt-3 grid gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-400">الموعد الحالي</p>
              <p className="mt-1 font-black text-slate-700">{booking?.selectedDate} — {booking?.selectedTime}</p>
            </div>
            <div className="text-center font-black text-[#b98a21]">↓</div>
            <div className="rounded-xl bg-[#fff7df] p-3">
              <p className="text-xs font-bold text-[#93701e]">الموعد الجديد</p>
              <p className="mt-1 font-black text-[#654a0e]">{selectedDate} — {selectedTime}</p>
            </div>
          </div>
        </div>
      ) : null}

      {sameAsCurrent ? (
        <p className="mt-3 text-sm font-bold text-amber-700">هذا هو موعدك الحالي. اختر موعدًا مختلفًا.</p>
      ) : null}
      {notice ? <p className="mt-3 text-sm font-bold text-amber-700">{notice}</p> : null}
      {submitError ? <p className="mt-3 text-sm font-bold text-red-600">{submitError}</p> : null}
      <button type="button" onClick={handleConfirm} disabled={!canConfirm} className="mt-5 min-h-[54px] w-full rounded-2xl bg-slate-900 px-5 font-black text-white disabled:bg-slate-200 disabled:text-slate-500">
        {saving ? "جارٍ تغيير الموعد..." : "تأكيد تغيير الموعد"}
      </button>
    </div>
  );
}
