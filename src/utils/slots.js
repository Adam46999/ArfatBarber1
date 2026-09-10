// src/utils/slots.js

export function safeInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function parseHHMM(value) {
  const match = String(value || "")
    .trim()
    .match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToHHMM(totalMinutes) {
  const normalized = ((Number(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutesToHHMM(hhmm, minsToAdd) {
  const baseMinutes = parseHHMM(hhmm);

  if (baseMinutes === null) {
    return String(hhmm || "00:00");
  }

  return minutesToHHMM(baseMinutes + (Number(minsToAdd) || 0));
}

/**
 * أدوار 30 دقيقة.
 * وقت النهاية نفسه يعتبر دورًا متاحًا.
 *
 * مثال:
 * 12:00 -> 20:00
 * آخر دور = 20:00
 */
export function generateSlots30Min(from, to) {
  const startMinutes = parseHHMM(from);
  const endMinutes = parseHHMM(to);

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes >= endMinutes
  ) {
    return [];
  }

  const slots = [];

  for (
    let currentMinutes = startMinutes;
    currentMinutes <= endMinutes;
    currentMinutes += 30
  ) {
    slots.push(minutesToHHMM(currentMinutes));
  }

  return slots;
}

export function applyExtraSlots(baseSlots, extraSlots) {
  const safeBaseSlots = Array.isArray(baseSlots) ? [...baseSlots] : [];
  const count = safeInt(extraSlots, 0);

  if (!count) return safeBaseSlots;
  if (safeBaseSlots.length === 0) return [];

  if (count > 0) {
    const lastSlot = safeBaseSlots[safeBaseSlots.length - 1];
    const lastSlotMinutes = parseHHMM(lastSlot);

    if (lastSlotMinutes === null) {
      return safeBaseSlots;
    }

    // الأدوار الإضافية يجب أن تبقى ضمن نفس التاريخ.
    // آخر دور آمن في اليوم الحالي هو 23:30.
    const latestSameDaySlotMinutes = 23 * 60 + 30;

    const maxExtraSlots = Math.max(
      0,
      Math.floor(
        (latestSameDaySlotMinutes - lastSlotMinutes) / 30,
      ),
    );

    const effectiveCount = Math.min(count, maxExtraSlots);
    const extras = [];

    for (let index = 1; index <= effectiveCount; index += 1) {
      extras.push(addMinutesToHHMM(lastSlot, index * 30));
    }

    return [...safeBaseSlots, ...extras];
  }

  const removeCount = Math.abs(count);

  return safeBaseSlots.slice(
    0,
    Math.max(0, safeBaseSlots.length - removeCount),
  );
}