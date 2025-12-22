// src/pages/BarberPanel.jsx
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { e164ToLocalPretty } from "../utils/phone";

const workingHours = {
  Sunday: null,
  Monday: { from: "12:00", to: "21:00" },
  Tuesday: { from: "12:00", to: "21:00" },
  Wednesday: { from: "12:00", to: "21:00" },
  Thursday: { from: "12:00", to: "22:00" },
  Friday: { from: "13:00", to: "23:30" },
  Saturday: { from: "11:00", to: "19:30" },
};

// ========= helpers =========
function safeInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function addDaysYMD(ymd, days) {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toISOString().slice(0, 10);
}

function getWeekdayNameEN(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function addMinutesToHHMM(hhmm, minsToAdd) {
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map(Number);
  const base = new Date();
  base.setHours(h || 0, m || 0, 0, 0);
  base.setMinutes(base.getMinutes() + (Number(minsToAdd) || 0));
  const HH = String(base.getHours()).padStart(2, "0");
  const MM = String(base.getMinutes()).padStart(2, "0");
  return `${HH}:${MM}`;
}

function generateSlots30Min(from, to) {
  if (!from || !to) return [];
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const cur = new Date();
  cur.setHours(fh, fm, 0, 0);
  const end = new Date();
  end.setHours(th, tm, 0, 0);

  const out = [];
  while (cur <= end) {
    out.push(cur.toTimeString().slice(0, 5));
    cur.setMinutes(cur.getMinutes() + 30);
  }
  return out;
}

function applyExtraSlots(baseSlots, extraSlots) {
  const n = safeInt(extraSlots, 0);
  if (!n) return baseSlots;

  if (n > 0) {
    const last = baseSlots[baseSlots.length - 1];
    const extras = [];
    for (let i = 1; i <= n; i++) extras.push(addMinutesToHHMM(last, i * 30));
    return [...baseSlots, ...extras];
  }

  const cut = Math.abs(n);
  return baseSlots.slice(0, Math.max(0, baseSlots.length - cut));
}

// ========= DateDropdown (كما هو) =========
function DateDropdown({ selectedDate, onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const temp = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const daysAr = [
        "الأحد",
        "الإثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ];
      let label = daysAr[d.getDay()];
      if (d.toDateString() === today.toDateString()) label += " (اليوم)";
      else if (d.toDateString() === tomorrow.toDateString()) label += " (بكرا)";

      temp.push({ value: iso, label });
    }
    setOptions(temp);
  }, []);

  return (
    <select
      value={selectedDate}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gold transition mb-4"
    >
      <option value="" disabled>
        اختر التاريخ من القائمة
      </option>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export default function BarberPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";
  const fontClass = isArabic ? "font-ar" : "font-body";

  const [selectedDate, setSelectedDate] = useState("");
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);

  // إعداد: حجز واحد لكل رقم/يوم
  const [limitOnePerDay, setLimitOnePerDay] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // ✅ extra slots (زيادة/نقص الأدوار)
  const [extraSlots, setExtraSlots] = useState(0);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [savingExtras, setSavingExtras] = useState(false);

  // نطاق تطبيق التعديل
  const [applyMode, setApplyMode] = useState("THIS_DATE"); // THIS_DATE | SAME_WEEKDAY_UNTIL | EVERY_DAY_UNTIL(متقدم)
  const [applyUntil, setApplyUntil] = useState(""); // yyyy-mm-dd

  // ====== حالة اليوم (مغلق/مفتوح) ======
  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      try {
        const ref = doc(db, "blockedDays", selectedDate);
        const snap = await getDoc(ref);
        setIsDayBlocked(snap.exists());
      } catch {
        setIsDayBlocked(false);
      }
    })();
  }, [selectedDate]);

  const toggleDay = async () => {
    if (!selectedDate) return;
    setLoadingBlock(true);
    const ref = doc(db, "blockedDays", selectedDate);
    try {
      if (isDayBlocked) {
        await deleteDoc(ref);
        setIsDayBlocked(false);
      } else {
        const bookingsSnap = await getDocs(
          query(
            collection(db, "bookings"),
            where("selectedDate", "==", selectedDate)
          )
        );
        const activeBookings = bookingsSnap.docs.filter(
          (d) => !d.data().cancelledAt
        );
        if (activeBookings.length > 0) {
          alert("⚠️ لا يمكن تعطيل هذا اليوم لأن هناك حجوزات لم يتم إلغاؤها.");
          return;
        }
        await setDoc(ref, {});
        setIsDayBlocked(true);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingBlock(false);
  };

  // ====== تسجيل خروج تلقائي ======
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

  // ====== جلب الحجوزات لحظيًا ======
  useEffect(() => {
    const q = query(collection(db, "bookings"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBookings(data);
      },
      (err) => console.error("خطأ بجلب الحجوزات (onSnapshot):", err)
    );
    return () => unsub();
  }, []);

  // ====== جلب إعداد limitOnePerDay ======
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const ref = doc(db, "barberSettings", "global");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const value =
            typeof data.limitOneBookingPerDayPerPhone === "boolean"
              ? data.limitOneBookingPerDayPerPhone
              : !!data.limitOneBookingPerDay;
          setLimitOnePerDay(value);
        } else setLimitOnePerDay(false);
      } catch (err) {
        console.error("خطأ بجلب إعدادات الحلاق:", err);
        setLimitOnePerDay(false);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggleLimitOnePerDay = async () => {
    if (loadingSettings || savingSettings) return;
    try {
      setSavingSettings(true);
      const ref = doc(db, "barberSettings", "global");
      await setDoc(
        ref,
        { limitOneBookingPerDayPerPhone: !limitOnePerDay },
        { merge: true }
      );
      setLimitOnePerDay((p) => !p);
    } catch (err) {
      console.error("خطأ بتحديث الإعداد:", err);
      alert("حدث خطأ أثناء تحديث الإعداد. حاول مرة أخرى.");
    } finally {
      setSavingSettings(false);
    }
  };

  // ====== الأوقات المحظورة ======
  useEffect(() => {
    if (!selectedDate) {
      setBlockedTimes([]);
      setSelectedTimes([]);
      setStatusMessage("");
      return;
    }
    (async () => {
      try {
        const ref = doc(db, "blockedTimes", selectedDate);
        const snap = await getDoc(ref);
        if (snap.exists()) setBlockedTimes(snap.data().times || []);
        else setBlockedTimes([]);
        setSelectedTimes([]);
        setStatusMessage("");
      } catch (err) {
        console.error("خطأ بجلب الأوقات المحظورة:", err);
        setBlockedTimes([]);
      }
    })();
  }, [selectedDate]);

  const activeBookings = useMemo(
    () => bookings.filter((b) => !b.cancelledAt),
    [bookings]
  );

  const isTimeBooked = (time) =>
    activeBookings.some(
      (b) => b.selectedDate === selectedDate && b.selectedTime === time
    );

  const handleToggleTime = async (time) => {
    if (isTimeBooked(time)) {
      setStatusMessage("هذه الساعة محجوزة ولا يمكن تعديلها.");
      return;
    }

    if (blockedTimes.includes(time)) {
      const updated = blockedTimes.filter((t) => t !== time);
      setBlockedTimes(updated);
      try {
        const ref = doc(db, "blockedTimes", selectedDate);
        await updateDoc(ref, { times: arrayRemove(time) });
        setStatusMessage("✅ تم استرجاع الساعة بنجاح");
      } catch (err) {
        console.error("خطأ باسترجاع الساعة:", err);
        setStatusMessage("حدث خطأ، حاول مرة أخرى.");
      }
      setTimeout(() => setStatusMessage(""), 2500);
      return;
    }

    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
    setStatusMessage("");
  };

  const handleApplyBlock = async () => {
    if (!selectedDate || selectedTimes.length === 0) {
      setStatusMessage("اختر ساعة واحدة على الأقل للحظر.");
      return;
    }

    for (const time of selectedTimes) {
      if (isTimeBooked(time)) {
        setStatusMessage(`الساعة ${time} محجوزة.`);
        return;
      }
    }

    try {
      const ref = doc(db, "blockedTimes", selectedDate);
      const snap = await getDoc(ref);
      if (!snap.exists()) await setDoc(ref, { times: [] });
      for (const time of selectedTimes)
        await updateDoc(ref, { times: arrayUnion(time) });
      setBlockedTimes([...blockedTimes, ...selectedTimes]);
      setSelectedTimes([]);
      setStatusMessage("✅ تم حظر الأوقات بنجاح");
    } catch (err) {
      console.error("خطأ بتطبيق الحظر:", err);
      setStatusMessage("حدث خطأ، حاول مرة أخرى.");
    }
    setTimeout(() => setStatusMessage(""), 2500);
  };

  // ====== ✅ جلب extraSlots لليوم المختار ======
  useEffect(() => {
    if (!selectedDate) {
      setExtraSlots(0);
      setApplyMode("THIS_DATE");
      setApplyUntil("");
      return;
    }

    let alive = true;
    (async () => {
      setLoadingExtras(true);
      try {
        const snap = await getDoc(doc(db, "slotExtras", selectedDate));
        if (!alive) return;
        if (snap.exists()) setExtraSlots(safeInt(snap.data()?.extraSlots, 0));
        else setExtraSlots(0);

        setApplyMode("THIS_DATE");
        setApplyUntil("");
      } catch (e) {
        console.error("fetch slotExtras error:", e);
        if (alive) setExtraSlots(0);
      } finally {
        if (alive) setLoadingExtras(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedDate]);

  // ====== ✅ أوقات اليوم + تطبيق extraSlots ======
  const timesForDay = useMemo(() => {
    if (!selectedDate) return null;

    const weekday = getWeekdayNameEN(selectedDate);
    const hours = workingHours?.[weekday] || null;
    if (!hours?.from || !hours?.to) return null;

    const base = generateSlots30Min(hours.from, hours.to);
    return applyExtraSlots(base, extraSlots);
  }, [selectedDate, extraSlots]);

  // فلترة أوقات اليوم الحالي من الماضي
  const todayStr = useMemo(() => new Date().toLocaleDateString("sv-SE"), []);
  const isToday = selectedDate && selectedDate === todayStr;

  const filteredTimes = useMemo(() => {
    if (!timesForDay) return null;
    if (!isToday) return timesForDay;
    const now = new Date();
    return timesForDay.filter(
      (time) => new Date(`${selectedDate}T${time}:00`) > now
    );
  }, [timesForDay, isToday, selectedDate]);

  // ====== أحدث الحجوزات ======
  const recentBookings = useMemo(() => {
    const getBookingCreationDate = (b) => {
      if (b.createdAt && typeof b.createdAt.toDate === "function")
        return b.createdAt.toDate();
      if (b.createdAt instanceof Date) return b.createdAt;
      try {
        if (b.selectedDate && b.selectedTime)
          return new Date(`${b.selectedDate}T${b.selectedTime}:00`);
      } catch {
        /* empty */
      }
      return new Date(0);
    };

    return [...activeBookings]
      .sort((a, b) => getBookingCreationDate(a) - getBookingCreationDate(b))
      .slice(-5)
      .reverse();
  }, [activeBookings]);

  // ====== ✅ تطبيق تعديل extraSlots ======
  const applyExtraSlotsChange = async (nextValue) => {
    if (!selectedDate) return;

    const value = safeInt(nextValue, 0);

    if (value < -10 || value > 10) {
      alert("⚠️ مسموح من -10 إلى +10 فقط (كل رقم = 30 دقيقة).");
      return;
    }

    const weekdayOfSelected = getWeekdayNameEN(selectedDate);

    const buildTargets = () => {
      if (applyMode === "THIS_DATE") return [selectedDate];

      if (!applyUntil) return null;

      const start = selectedDate;
      const end = applyUntil;
      if (end < start) return null;

      const targets = [];
      let d = start;
      while (d <= end) {
        if (applyMode === "EVERY_DAY_UNTIL") {
          targets.push(d);
        } else if (applyMode === "SAME_WEEKDAY_UNTIL") {
          const wd = getWeekdayNameEN(d);
          if (wd === weekdayOfSelected) targets.push(d);
        }
        d = addDaysYMD(d, 1);
      }
      return targets;
    };

    const targets = buildTargets();
    if (!targets) {
      alert("⚠️ اختَر تاريخ نهاية صحيح (لازم يكون بعد/يساوي تاريخ البداية).");
      return;
    }

    // منع التقليل إذا سيحذف دور عليه حجز
    if (value < 0) {
      for (const ymd of targets) {
        const weekday = getWeekdayNameEN(ymd);
        const hours = workingHours?.[weekday] || null;
        if (!hours?.from || !hours?.to) continue;

        const base = generateSlots30Min(hours.from, hours.to);

        const currentExtraSnap = await getDoc(doc(db, "slotExtras", ymd));
        const currentExtra = currentExtraSnap.exists()
          ? safeInt(currentExtraSnap.data()?.extraSlots, 0)
          : 0;

        const currentSlots = applyExtraSlots(base, currentExtra);
        const nextSlots = applyExtraSlots(base, value);

        const removed = currentSlots.filter((s) => !nextSlots.includes(s));
        if (removed.length) {
          const hasBookingOnRemoved = activeBookings.some(
            (b) => b.selectedDate === ymd && removed.includes(b.selectedTime)
          );
          if (hasBookingOnRemoved) {
            alert(
              `⚠️ لا يمكن تقليل الأدوار في ${ymd} لأن هناك حجز على دور سيتم حذفه.\n(حلّها: الغِ الحجز أو غيّر التعديل)`
            );
            return;
          }
        }
      }
    }

    try {
      setSavingExtras(true);

      const writes = targets.map((ymd) =>
        setDoc(
          doc(db, "slotExtras", ymd),
          { extraSlots: value },
          { merge: true }
        )
      );
      await Promise.all(writes);

      setExtraSlots(value);

      setStatusMessage(
        applyMode === "THIS_DATE"
          ? `✅ تم تطبيق التعديل على ${selectedDate}`
          : applyMode === "SAME_WEEKDAY_UNTIL"
          ? `✅ تم تطبيق التعديل على كل ${weekdayOfSelected} حتى ${applyUntil}`
          : `✅ تم تطبيق التعديل على كل الأيام حتى ${applyUntil}`
      );
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء حفظ التعديل. حاول مرة أخرى.");
    } finally {
      setSavingExtras(false);
      setTimeout(() => setStatusMessage(""), 2500);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 p-6 ${fontClass}`} dir="rtl">
      <div className="h-16"></div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
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

        {/* اختيار التاريخ + حالة اليوم */}
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
          {selectedDate && !timesForDay && (
            <p className="mt-3 text-sm text-red-600 font-medium">
              هذا اليوم مغلق
            </p>
          )}
        </div>

        {/* ✅ كرت تعديل الأدوار — تحت الساعات */}
        {selectedDate && timesForDay && !isDayBlocked && (
          <div className="px-8 pb-10">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    تعديل عدد الأدوار لآخر اليوم
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    كل دور = 30 دقيقة. هذا لا يغيّر ساعات العمل الأساسية، فقط
                    يزيد/ينقص أدوار بنهاية اليوم.
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-500">
                    القيمة الحالية
                  </div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {loadingExtras
                      ? "…"
                      : extraSlots >= 0
                      ? `+${extraSlots}`
                      : `${extraSlots}`}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Quick buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    سريع:
                  </span>

                  {/* + */}
                  <button
                    type="button"
                    disabled={loadingExtras || savingExtras}
                    onClick={() => applyExtraSlotsChange(extraSlots + 1)}
                    className="px-3 py-2 rounded-xl bg-gold text-primary font-extrabold hover:opacity-90 disabled:opacity-60"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    disabled={loadingExtras || savingExtras}
                    onClick={() => applyExtraSlotsChange(extraSlots + 2)}
                    className="px-3 py-2 rounded-xl border border-gold text-gold font-extrabold hover:bg-gold hover:text-primary disabled:opacity-60"
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    disabled={loadingExtras || savingExtras}
                    onClick={() => applyExtraSlotsChange(extraSlots + 3)}
                    className="px-3 py-2 rounded-xl border border-gold text-gold font-extrabold hover:bg-gold hover:text-primary disabled:opacity-60"
                  >
                    +3
                  </button>

                  <span className="mx-1 w-px h-8 bg-slate-200" />

                  {/* - */}
                  <button
                    type="button"
                    disabled={loadingExtras || savingExtras}
                    onClick={() => applyExtraSlotsChange(extraSlots - 1)}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-900 font-extrabold hover:bg-slate-200 disabled:opacity-60"
                    title="ينقص آخر دور"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    disabled={loadingExtras || savingExtras}
                    onClick={() => applyExtraSlotsChange(extraSlots - 2)}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-900 font-extrabold hover:bg-slate-200 disabled:opacity-60"
                    title="ينقص آخر دورين"
                  >
                    -2
                  </button>

                  <div className="flex-1" />

                  <button
                    type="button"
                    disabled={loadingExtras || savingExtras}
                    onClick={() => applyExtraSlotsChange(0)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold disabled:opacity-60"
                    title="يرجع للوضع الطبيعي"
                  >
                    رجّع طبيعي (0)
                  </button>
                </div>

                {/* Apply range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">
                      نطاق التطبيق
                    </label>
                    <select
                      value={applyMode}
                      onChange={(e) => setApplyMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    >
                      <option value="THIS_DATE">هذا اليوم فقط</option>
                      <option value="SAME_WEEKDAY_UNTIL">
                        نفس يوم الأسبوع لحد تاريخ
                      </option>
                      <option value="EVERY_DAY_UNTIL">
                        كل الأيام لحد تاريخ
                      </option>
                    </select>

                    <div className="mt-2 text-[11px] text-slate-600 leading-relaxed">
                      {applyMode === "THIS_DATE" && (
                        <span>
                          ينطبق فقط على: <b>{selectedDate}</b>
                        </span>
                      )}
                      {applyMode === "SAME_WEEKDAY_UNTIL" && (
                        <span>
                          ينطبق على <b>نفس يوم الأسبوع</b> من{" "}
                          <b>{selectedDate}</b> حتى تاريخ النهاية.
                        </span>
                      )}
                      {applyMode === "EVERY_DAY_UNTIL" && (
                        <span>
                          ينطبق على <b>كل الأيام</b> من <b>{selectedDate}</b>{" "}
                          حتى تاريخ النهاية.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      value={applyUntil}
                      onChange={(e) => setApplyUntil(e.target.value)}
                      disabled={applyMode === "THIS_DATE"}
                      min={selectedDate || undefined}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60"
                    />

                    <p className="mt-2 text-[11px] text-slate-600">
                      ملاحظة: إذا في حجز على دور رح ينحذف، النظام بمنع التقليل
                      عشان ما ينكسر شيء.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* لوحة الساعات */}
        {selectedDate && filteredTimes && !isDayBlocked && (
          <div className="p-8 pt-4 border-t bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              الأوقات المتاحة:
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
              {filteredTimes.map((time) => {
                const booked = activeBookings.some(
                  (b) =>
                    b.selectedDate === selectedDate && b.selectedTime === time
                );
                const isBlocked = blockedTimes.includes(time);
                const isSelected = selectedTimes.includes(time);

                return (
                  <button
                    key={time}
                    onClick={() => handleToggleTime(time)}
                    disabled={booked}
                    className={`py-2 rounded-xl text-sm font-medium text-center transition-all duration-200 ${
                      booked
                        ? "bg-red-700 text-white cursor-not-allowed"
                        : isBlocked
                        ? "bg-red-200 text-red-800"
                        : isSelected
                        ? "bg-yellow-300 text-gray-900 ring-2 ring-yellow-500"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                    title={
                      booked
                        ? "هذه الساعة محجوزة"
                        : isBlocked
                        ? "هذه الساعة محظورة"
                        : "اضغط للحظر/الإلغاء"
                    }
                  >
                    {time}
                  </button>
                );
              })}
            </div>

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

        {statusMessage && (
          <div className="p-4 bg-green-100 border border-green-300 text-green-800 text-center font-medium">
            {statusMessage}
          </div>
        )}
      </div>

      {/* عرض سريع للحجوزات الأخيرة */}
      {recentBookings.length > 0 && (
        <div className="max-w-3xl mx-auto mt-6 text-xs sm:text-sm">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-5 text-slate-900">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-slate-900">
                    أحدث الحجوزات (رقم موحّد)
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    آخر {recentBookings.length} حجوزات فعّالة
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 border-t border-slate-100 divide-y divide-slate-100">
              {recentBookings.map((b, idx) => (
                <div
                  key={b.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 rounded-xl px-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-[11px] text-slate-500">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 text-sm sm:text-base">
                        {b.fullName || "بدون اسم"}
                      </span>
                      <div className="mt-1 inline-flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-0.5 border border-amber-200 text-amber-800">
                          {b.selectedDate || "—"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-0.5 border border-sky-200 text-sky-700">
                          {b.selectedTime || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end sm:min-w-[150px] text-[11px] sm:text-xs">
                    <span className="text-slate-500">الرقم الموحّد:</span>
                    <span className="font-mono text-sm text-slate-900">
                      {e164ToLocalPretty(b.phoneNumber)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* كرت إعداد حجز واحد لكل رقم/يوم */}
      <div className="max-w-3xl mx-auto mt-6">
        <div className="bg-white rounded-2xl shadow p-4 border border-gray-200 text-center">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            وضع حجز واحد لكل رقم / يوم
          </h2>
          <div className="flex items-center justify-center gap-4 mb-2">
            <span className="text-xs font-semibold text-gray-700">
              {limitOnePerDay ? "مُفَعَّل" : "مُعَطَّل"}
            </span>

            <button
              type="button"
              onClick={handleToggleLimitOnePerDay}
              disabled={loadingSettings || savingSettings}
              className="disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div
                className={`relative w-16 h-8 rounded-full transition-colors flex items-center ${
                  limitOnePerDay ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-md transition-transform ${
                    limitOnePerDay ? "translate-x-8" : "translate-x-0"
                  }`}
                />
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-500">
            {limitOnePerDay
              ? "مُفعَّل: لا يمكن لنفس الرقم حجز أكثر من موعد في نفس اليوم."
              : "مُعطَّل: يمكن لنفس الرقم حجز أكثر من موعد في نفس اليوم."}
          </p>
        </div>
      </div>
    </div>
  );
}
