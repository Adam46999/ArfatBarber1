// src/utils/slots.js

export function safeInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function addMinutesToHHMM(hhmm, minsToAdd) {
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

/**
 * ✅ أدوار 30 دقيقة (النهاية غير شاملة)
 * مثال: 12:00 -> 20:00 => آخر دور 19:30
 */
export function generateSlots30Min(from, to) {
  if (!from || !to) return [];
  const [fh, fm] = String(from).split(":").map(Number);
  const [th, tm] = String(to).split(":").map(Number);

  const cur = new Date();
  cur.setHours(fh || 0, fm || 0, 0, 0);

  const end = new Date();
  end.setHours(th || 0, tm || 0, 0, 0);

  const out = [];
  while (cur <= end) {
    out.push(cur.toTimeString().slice(0, 5));
    cur.setMinutes(cur.getMinutes() + 30);
  }
  return out;
}

export function applyExtraSlots(baseSlots, extraSlots) {
  const n = safeInt(extraSlots, 0);
  if (!n) return baseSlots;

  if (baseSlots.length === 0) return [];

  if (n > 0) {
    const last = baseSlots[baseSlots.length - 1];
    const extras = [];
    for (let i = 1; i <= n; i++) extras.push(addMinutesToHHMM(last, i * 30));
    return [...baseSlots, ...extras];
  }

  const cut = Math.abs(n);
  return baseSlots.slice(0, Math.max(0, baseSlots.length - cut));
}
