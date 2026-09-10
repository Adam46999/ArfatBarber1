import { useEffect, useMemo, useState } from "react";
import {
  collection,
  documentId,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import { computeDayAvailability } from "../utils/calendarAvailability.js";
import { addDaysToYMD } from "../utils/slots.js";

const SOURCE_KEYS = [
  "bookedSlots",
  "blockedDays",
  "blockedTimes",
  "slotExtras",
];

function allSourcesReady(readiness) {
  return SOURCE_KEYS.every((key) => readiness[key]);
}

function firstSourceError(errors) {
  return SOURCE_KEYS.find((key) => errors[key]) || null;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatYMD(date) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
}

function getMonthRange(monthDate) {
  if (!(monthDate instanceof Date) || Number.isNaN(monthDate.getTime())) {
    return null;
  }

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return {
    startYMD: formatYMD(startDate),
    endYMD: formatYMD(endDate),
    daysInMonth: endDate.getDate(),
    year,
    month,
  };
}

function normalizeTimeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (time) =>
      typeof time === "string" &&
      /^\d{2}:\d{2}$/.test(time.trim()),
  );
}

/**
 * Availability summary for one visible calendar month.
 *
 * Important safety rules:
 * - exactly four Firestore listeners.
 * - no per-day Firebase listeners.
 * - no partial availability is exposed.
 * - if any source fails, summaryByDate remains empty.
 * - this hook never changes booking data.
 */
export default function useMonthAvailability({
  monthDate,
  workingHours,
  enabled = true,
}) {
  const monthRange = useMemo(
    () => getMonthRange(monthDate),
    [monthDate],
  );

  const [summaryByDate, setSummaryByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (
      !enabled ||
      !monthRange ||
      !workingHours ||
      typeof workingHours !== "object"
    ) {
      setSummaryByDate({});
      setLoading(false);
      setReady(false);
      setError(null);

      return undefined;
    }

    let active = true;

    let bookedSlotKeys = new Set();
    let blockedDays = new Set();
    let blockedTimesByDate = {};
    let slotExtrasByDate = {};

    const readiness = {
      bookedSlots: false,
      blockedDays: false,
      blockedTimes: false,
      slotExtras: false,
    };

    const sourceErrors = {
      bookedSlots: null,
      blockedDays: null,
      blockedTimes: null,
      slotExtras: null,
    };

    setSummaryByDate({});
    setLoading(true);
    setReady(false);
    setError(null);

    const recompute = () => {
      if (!active) {
        return;
      }

      const sourcesReady = allSourcesReady(readiness);

      setReady(sourcesReady);

      if (!sourcesReady) {
        setLoading(true);
        return;
      }

      const failedSource = firstSourceError(sourceErrors);

      if (failedSource) {
        setSummaryByDate({});
        setLoading(false);
        setError(failedSource);

        return;
      }

      const nextSummary = {};

      for (let day = 1; day <= monthRange.daysInMonth; day += 1) {
        const dateYMD = [
          monthRange.year,
          pad2(monthRange.month + 1),
          pad2(day),
        ].join("-");

        nextSummary[dateYMD] = computeDayAvailability({
          dateYMD,
          workingHours,
          isDayBlocked: blockedDays.has(dateYMD),
          blockedTimes: blockedTimesByDate[dateYMD] || [],
          extraSlots: slotExtrasByDate[dateYMD] || 0,
          bookedTimes: bookedSlotKeys,
          now: new Date(),
        });
      }

      setSummaryByDate(nextSummary);
      setLoading(false);
      setError(null);
    };

    const markSuccess = (sourceKey) => {
      readiness[sourceKey] = true;
      sourceErrors[sourceKey] = null;

      recompute();
    };

    const markError = (sourceKey, currentError) => {
      console.error(
        `Month availability ${sourceKey} snapshot error:`,
        currentError,
      );

      readiness[sourceKey] = true;
      sourceErrors[sourceKey] = currentError || true;

      recompute();
    };

    const bookedSlotsPhysicalEnd =
      addDaysToYMD(monthRange.endYMD, 1) || monthRange.endYMD;

    const bookedSlotsQuery = query(
      collection(db, "bookedSlots"),
      where(documentId(), ">=", `${monthRange.startYMD}_00-00`),
      where(documentId(), "<=", `${bookedSlotsPhysicalEnd}_04-00`),
    );

    const blockedDaysQuery = query(
      collection(db, "blockedDays"),
      where(documentId(), ">=", monthRange.startYMD),
      where(documentId(), "<=", monthRange.endYMD),
    );

    const blockedTimesQuery = query(
      collection(db, "blockedTimes"),
      where(documentId(), ">=", monthRange.startYMD),
      where(documentId(), "<=", monthRange.endYMD),
    );

    const slotExtrasQuery = query(
      collection(db, "slotExtras"),
      where(documentId(), ">=", monthRange.startYMD),
      where(documentId(), "<=", monthRange.endYMD),
    );

    const unsubscribeBookedSlots = onSnapshot(
      bookedSlotsQuery,
      (snapshot) => {
        const nextBookedSlotKeys = new Set();

        snapshot.docs.forEach((snapshotDocument) => {
          const slot = snapshotDocument.data();

          if (slot?.active !== true) {
            return;
          }

          const selectedTime = slot?.selectedTime;
          const idDate = String(snapshotDocument.id || "").slice(0, 10);
          const physicalDate =
            typeof slot?.slotDate === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(slot.slotDate)
              ? slot.slotDate
              : idDate;

          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(physicalDate) ||
            typeof selectedTime !== "string" ||
            !/^\d{2}:\d{2}$/.test(selectedTime)
          ) {
            return;
          }

          nextBookedSlotKeys.add(`${physicalDate}|${selectedTime}`);
        });

        bookedSlotKeys = nextBookedSlotKeys;

        markSuccess("bookedSlots");
      },
      (currentError) => {
        markError("bookedSlots", currentError);
      },
    );

    const unsubscribeBlockedDays = onSnapshot(
      blockedDaysQuery,
      (snapshot) => {
        blockedDays = new Set(
          snapshot.docs.map(
            (snapshotDocument) => snapshotDocument.id,
          ),
        );

        markSuccess("blockedDays");
      },
      (currentError) => {
        markError("blockedDays", currentError);
      },
    );

    const unsubscribeBlockedTimes = onSnapshot(
      blockedTimesQuery,
      (snapshot) => {
        const nextBlockedTimesByDate = {};

        snapshot.docs.forEach((snapshotDocument) => {
          nextBlockedTimesByDate[snapshotDocument.id] =
            normalizeTimeArray(
              snapshotDocument.data()?.times,
            );
        });

        blockedTimesByDate = nextBlockedTimesByDate;

        markSuccess("blockedTimes");
      },
      (currentError) => {
        markError("blockedTimes", currentError);
      },
    );

    const unsubscribeSlotExtras = onSnapshot(
      slotExtrasQuery,
      (snapshot) => {
        const nextSlotExtrasByDate = {};

        snapshot.docs.forEach((snapshotDocument) => {
          const rawValue =
            snapshotDocument.data()?.extraSlots;

          const parsedValue = Number(rawValue);

          nextSlotExtrasByDate[snapshotDocument.id] =
            Number.isFinite(parsedValue)
              ? Math.trunc(parsedValue)
              : 0;
        });

        slotExtrasByDate = nextSlotExtrasByDate;

        markSuccess("slotExtras");
      },
      (currentError) => {
        markError("slotExtras", currentError);
      },
    );

    const clockInterval = setInterval(() => {
      recompute();
    }, 30_000);

    return () => {
      active = false;

      clearInterval(clockInterval);

      unsubscribeBookedSlots();
      unsubscribeBlockedDays();
      unsubscribeBlockedTimes();
      unsubscribeSlotExtras();
    };
  }, [
    enabled,
    monthRange,
    workingHours,
  ]);

  return useMemo(
    () => ({
      summaryByDate,
      loading,
      ready,
      error,
    }),
    [
      summaryByDate,
      loading,
      ready,
      error,
    ],
  );
}