import { applyExtraSlots, generateSlots30Min } from "./slots.js";

function localYMD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeTimes(times) {
  const source = times instanceof Set ? [...times] : times;

  if (!Array.isArray(source)) {
    return [];
  }

  return [
    ...new Set(
      source
        .filter(
          (time) =>
            typeof time === "string" &&
            /^\d{2}:\d{2}$/.test(time.trim()),
        )
        .map((time) => time.trim()),
    ),
  ].sort();
}

function toDateAt(dateYMD, timeHHMM) {
  const date = new Date(`${dateYMD}T${timeHHMM}:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekdayName(dateYMD) {
  const date = new Date(`${dateYMD}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

/**
 * يحسب توفر يوم واحد فقط.
 *
 * مهم:
 * هذا المحرك لا يقرأ Firebase ولا يغيّر أي بيانات.
 * يستقبل البيانات الجاهزة ويستخدم نفس slot utilities
 * التي يستخدمها نظام الحجز الحالي.
 */
export function computeDayAvailability({
  dateYMD,
  workingHours,
  isDayBlocked = false,
  blockedTimes = [],
  extraSlots = 0,
  bookedTimes = [],
  now = new Date(),
}) {
  const todayYMD = localYMD(now);

  if (
    typeof dateYMD !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateYMD)
  ) {
    return {
      status: "unavailable",
      totalSlots: 0,
      availableSlots: 0,
      unavailableSlots: 0,
      availabilityRatio: 0,
      availableTimes: [],
    };
  }

  if (dateYMD < todayYMD) {
    return {
      status: "past",
      totalSlots: 0,
      availableSlots: 0,
      unavailableSlots: 0,
      availabilityRatio: 0,
      availableTimes: [],
    };
  }

  const weekday = getWeekdayName(dateYMD);
  const dayHours = weekday ? workingHours?.[weekday] : null;

  if (
    isDayBlocked ||
    !dayHours?.from ||
    !dayHours?.to
  ) {
    return {
      status: "closed",
      totalSlots: 0,
      availableSlots: 0,
      unavailableSlots: 0,
      availabilityRatio: 0,
      availableTimes: [],
    };
  }

  /**
   * نستخدم نفس الدوال التي يستخدمها useAvailableTimes.
   * لا نعيد كتابة منطق توليد الأدوار هنا.
   */
  const scheduledSlots = normalizeTimes(
    applyExtraSlots(
      generateSlots30Min(dayHours.from, dayHours.to),
      extraSlots,
    ),
  );

  /**
   * في اليوم الحالي نحسب فقط الأدوار التي ما زالت بالمستقبل.
   * الساعات التي مرت لا تجعل اليوم يبدو "ممتلئًا".
   */
  const relevantSlots =
    dateYMD === todayYMD
      ? scheduledSlots.filter((time) => {
          const appointmentDate = toDateAt(dateYMD, time);

          return Boolean(
            appointmentDate &&
            appointmentDate > now
          );
        })
      : scheduledSlots;

  const blockedSet = new Set(normalizeTimes(blockedTimes));
  const bookedSet = new Set(normalizeTimes(bookedTimes));

  const availableTimes = relevantSlots.filter(
    (time) =>
      !blockedSet.has(time) &&
      !bookedSet.has(time),
  );

  const totalSlots = relevantSlots.length;
  const availableSlots = availableTimes.length;
  const unavailableSlots = Math.max(
    0,
    totalSlots - availableSlots,
  );

  const availabilityRatio =
    totalSlots > 0
      ? availableSlots / totalSlots
      : 0;

  let status = "available";

  if (totalSlots === 0) {
    status = "unavailable";
  } else if (availableSlots === 0) {
    status = "full";
  }

  return {
    status,
    totalSlots,
    availableSlots,
    unavailableSlots,
    availabilityRatio,
    availableTimes,
  };
}