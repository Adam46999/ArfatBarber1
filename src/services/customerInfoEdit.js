// src/services/customerInfoEdit.js

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  fetchActiveBookingsByDate,
  isPhoneBlocked,
} from "./bookingService";

import {
  isILPhoneE164,
  toILPhoneE164,
} from "../utils/phone";

import { isNameValid } from "../utils/validators";

async function readLimitOnePerDaySetting() {
  const snapshot = await getDoc(
    doc(db, "barberSettings", "global"),
  );

  if (!snapshot.exists()) return false;

  const data = snapshot.data() || {};

  return typeof data.limitOneBookingPerDayPerPhone ===
    "boolean"
    ? data.limitOneBookingPerDayPerPhone
    : Boolean(data.limitOneBookingPerDay);
}

function safeAction(value) {
  const allowed = new Set([
    "EDIT",
    "UNDO",
    "RESTORE_HISTORY",
  ]);

  return allowed.has(value) ? value : "EDIT";
}

export async function updateBookingCustomerInfo(
  booking,
  values,
  metadata = {},
) {
  if (!booking?.id) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  const safeName = String(
    values?.fullName || "",
  ).trim();

  const rawPhone = String(
    values?.phoneNumber || "",
  ).trim();

  if (!isNameValid(safeName)) {
    throw new Error("INVALID_CUSTOMER_NAME");
  }

  let safePhone = "";

  if (rawPhone) {
    safePhone = toILPhoneE164(rawPhone);

    if (!isILPhoneE164(safePhone)) {
      throw new Error("INVALID_CUSTOMER_PHONE");
    }
  } else if (!booking.manualBooking) {
    throw new Error("PHONE_REQUIRED");
  }

  const oldPhone =
    toILPhoneE164(booking.phoneNumber) ||
    String(booking.phoneNumber || "").trim();

  const phoneChanged = safePhone !== oldPhone;

  /*
   * Only run phone-specific business checks
   * when the phone was actually changed.
   */
  if (phoneChanged && safePhone) {
    if (await isPhoneBlocked(safePhone)) {
      throw new Error("PHONE_BLOCKED");
    }

    if (await readLimitOnePerDaySetting()) {
      const sameDayBookings =
        await fetchActiveBookingsByDate(
          booking.selectedDate,
        );

      const conflict = sameDayBookings.some(
        (candidate) =>
          candidate.id !== booking.id &&
          toILPhoneE164(
            candidate.phoneNumber,
          ) === safePhone,
      );

      if (conflict) {
        throw new Error(
          "PHONE_ALREADY_BOOKED_TODAY",
        );
      }
    }
  }

  const bookingRef = doc(
    db,
    "bookings",
    booking.id,
  );

  const editedAt = new Date().toISOString();

  const action = safeAction(metadata?.action);

  let result = null;

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(bookingRef);

      if (!snapshot.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      const latest = snapshot.data() || {};

      const latestName = String(
        latest.fullName || "",
      ).trim();

      const latestPhone = latest.phoneNumber
        ? toILPhoneE164(
            latest.phoneNumber,
          ) ||
          String(
            latest.phoneNumber,
          ).trim()
        : "";

      const changes = {};

      if (safeName !== latestName) {
        changes.fullName = {
          from: latestName,
          to: safeName,
        };
      }

      if (safePhone !== latestPhone) {
        changes.phoneNumber = {
          from: latestPhone,
          to: safePhone,
        };
      }

      if (
        Object.keys(changes).length === 0
      ) {
        result = {
          id: booking.id,
          ...latest,
        };

        return;
      }

      const previousHistory =
        Array.isArray(
          latest.customerInfoEditHistory,
        )
          ? latest.customerInfoEditHistory
          : [];

      const historyEntry = {
        id: `${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`,

        editedAt,

        editedBy: "BARBER",

        action,

        sourceHistoryId:
          metadata?.sourceHistoryId || null,

        changes,
      };

      const customerInfoEditHistory = [
        ...previousHistory,
        historyEntry,
      ];

      transaction.update(bookingRef, {
        fullName: safeName,
        phoneNumber: safePhone,

        customerInfoUpdatedAt:
          serverTimestamp(),

        customerInfoUpdatedBy:
          "BARBER",

        customerInfoEditHistory,
      });

      result = {
        id: booking.id,
        ...latest,

        fullName: safeName,
        phoneNumber: safePhone,

        customerInfoUpdatedAt:
          editedAt,

        customerInfoUpdatedBy:
          "BARBER",

        customerInfoEditHistory,
      };
    },
  );

  if (!result) {
    throw new Error(
      "CUSTOMER_INFO_UPDATE_FAILED",
    );
  }

  return result;
}