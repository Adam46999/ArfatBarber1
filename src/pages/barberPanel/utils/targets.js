// src/pages/barberPanel/utils/targets.js
import { addDaysYMD, getWeekdayNameEN } from "./dates";

/**
 * applyMode:
 * - THIS_DATE
 * - SAME_WEEKDAY_UNTIL
 * - EVERY_DAY_UNTIL
 */
export function buildTargets({ applyMode, selectedDate, applyUntil }) {
  if (applyMode === "THIS_DATE") return [selectedDate];

  if (!applyUntil) return null;
  if (applyUntil < selectedDate) return null;

  const weekdayOfSelected = getWeekdayNameEN(selectedDate);
  const targets = [];

  let d = selectedDate;
  while (d <= applyUntil) {
    if (applyMode === "EVERY_DAY_UNTIL") {
      targets.push(d);
    } else if (applyMode === "SAME_WEEKDAY_UNTIL") {
      const wd = getWeekdayNameEN(d);
      if (wd === weekdayOfSelected) targets.push(d);
    }
    d = addDaysYMD(d, 1);
  }

  return targets;
}
