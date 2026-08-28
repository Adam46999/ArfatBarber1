// src/pages/adminBookings/useAdminBookingsData.js

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase";

import {
  archiveExpiredBooking,
  cancelBookingWithStats,
  deletePastBookingWithStats,
  syncPassedBookingsForCompletedStats,
} from "../../services/completedStats";

/**
 * إنشاء معرّف ثابت للموعد داخل bookedSlots.
 *
 * مثال:
 * 2026-07-25 + 14:30
 * يصبح:
 * 2026-07-25_14-30
 */
function makeSlotId(dateYMD, hhmm) {
  return `${dateYMD}_${String(hhmm || "").replace(":", "-")}`;
}

/**
 * تحويل تاريخ ووقت الحجز إلى Date.
 */
function bookingDateTime(booking) {
  const selectedDate = String(booking?.selectedDate || "");

  const selectedTime = String(booking?.selectedTime || "00:00");

  const date = new Date(`${selectedDate}T${selectedTime}:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function useAdminBookingsData() {
  const [upcoming, setUpcoming] = useState([]);
  const [recentPast, setRecentPast] = useState([]);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let alive = true;

    async function fetchAndClassify() {
      try {
        const now = new Date();
        const nowMs = now.getTime();

        const snapshot = await getDocs(query(collection(db, "bookings")));

        const allBookings = snapshot.docs.map((bookingDocument) => ({
          id: bookingDocument.id,
          ...bookingDocument.data(),
        }));

        /*
         * أول ما يبدأ وقت الدور:
         *
         * - ينحسب بالإحصائيات.
         * - بشرط ألا يكون ملغيًا.
         * - ولا ينحسب مرتين.
         */
        await syncPassedBookingsForCompletedStats(allBookings, nowMs);

        const upcomingBookings = [];
        const pastBookings = [];

        for (const booking of allBookings) {
          const bookingTime = bookingDateTime(booking);

          if (!bookingTime) continue;

          const differenceHours =
            (nowMs - bookingTime.getTime()) / (1000 * 60 * 60);

          /*
           * بعد مرور ساعتين على وقت الدور:
           *
           * - نحذف تفاصيل الحجز القديمة.
           * - يبقى العدد الشهري محفوظًا.
           */
          if (differenceHours > 2) {
            await archiveExpiredBooking(booking.id, nowMs);

            continue;
          }

          /*
           * الحجز يذهب إلى السجل المؤقت إذا:
           *
           * - كان ملغيًا.
           * - أو بدأ وقته.
           *
           * ويظل ظاهرًا لمدة ساعتين فقط.
           */
          if (booking.cancelledAt || differenceHours >= 0) {
            pastBookings.push(booking);
          } else {
            upcomingBookings.push(booking);
          }
        }

        /*
         * الحجوزات القادمة:
         * الأقرب أولًا.
         */
        upcomingBookings.sort((firstBooking, secondBooking) => {
          const firstTime = bookingDateTime(firstBooking)?.getTime() || 0;

          const secondTime = bookingDateTime(secondBooking)?.getTime() || 0;

          return firstTime - secondTime;
        });

        /*
         * السجل المؤقت:
         * الأحدث أولًا.
         */
        pastBookings.sort((firstBooking, secondBooking) => {
          const firstTime = bookingDateTime(firstBooking)?.getTime() || 0;

          const secondTime = bookingDateTime(secondBooking)?.getTime() || 0;

          return secondTime - firstTime;
        });

        if (!alive) return;

        setUpcoming(upcomingBookings);
        setRecentPast(pastBookings);

        setLoading(false);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("fetchAndClassify error:", error);

        if (!alive) return;

        setLoading(false);
      }
    }

    /*
     * تحميل مباشر عند فتح الصفحة.
     */
    fetchAndClassify();

    /*
     * إعادة الفحص كل دقيقة حتى:
     *
     * - ينتقل الدور من القادم إلى السجل.
     * - ينحسب الدور عند بداية وقته.
     * - ينحذف بعد ساعتين.
     */
    const interval = window.setInterval(fetchAndClassify, 60 * 1000);
    window.addEventListener("barber-bookings-refresh", fetchAndClassify);

    return () => {
      alive = false;

      window.removeEventListener("barber-bookings-refresh", fetchAndClassify);
      window.clearInterval(interval);
    };
  }, []);

  const actions = useMemo(() => {
    return {
      /**
       * إلغاء حجز قادم.
       *
       * إذا كان الحجز انحسب سابقًا لأي سبب،
       * ينقص من الإحصائيات تلقائيًا.
       */
      async cancelBooking(booking) {
        await cancelBookingWithStats(booking.id, "BARBER");

        const cancelledAt = new Date().toISOString();

        /*
         * إزالة الحجز من القائمة القادمة.
         */
        setUpcoming((currentBookings) =>
          currentBookings.filter(
            (currentBooking) => currentBooking.id !== booking.id,
          ),
        );

        /*
         * إضافته إلى السجل المؤقت كحجز ملغي.
         */
        setRecentPast((currentBookings) => [
          {
            ...booking,

            cancelledAt,
            cancelledBy: "BARBER",

            completedStatsCounted: false,
            completedStatsCountedAt: null,
          },

          ...currentBookings,
        ]);
      },

      /**
       * استرجاع حجز ملغي.
       */
      async restoreBooking(booking, upcomingList) {
        /*
         * فحص سريع من القائمة الموجودة بالواجهة.
         */
        const localConflict = upcomingList.some(
          (currentBooking) =>
            currentBooking.selectedDate === booking.selectedDate &&
            currentBooking.selectedTime === booking.selectedTime,
        );

        if (localConflict) {
          window.alert("لا يمكن استرجاع هذا الحجز؛ الموعد محجوز حاليًا.");

          return;
        }

        /*
         * فحص نهائي من Firestore حتى لا يحصل
         * تعارض لو تغيرت البيانات من جهاز آخر.
         */
        const conflictQuery = query(
          collection(db, "bookings"),

          where("selectedDate", "==", booking.selectedDate),

          where("selectedTime", "==", booking.selectedTime),
        );

        const conflictSnapshot = await getDocs(conflictQuery);

        const activeConflicts = conflictSnapshot.docs
          .filter((bookingDocument) => bookingDocument.id !== booking.id)
          .map((bookingDocument) => bookingDocument.data())
          .filter((bookingData) => !bookingData.cancelledAt);

        if (activeConflicts.length > 0) {
          window.alert("لا يمكن استرجاع هذا الحجز؛ تم حجز الموعد من قبل.");

          return;
        }

        /*
         * إزالة حالة الإلغاء.
         *
         * نعيد completedStatsCounted إلى false
         * حتى يعاد تقييم الدور بشكل صحيح.
         */
        await updateDoc(doc(db, "bookings", booking.id), {
          cancelledAt: deleteField(),
          cancelledBy: deleteField(),

          completedStatsCounted: false,
          completedStatsCountedAt: null,
        });

        /*
         * إعادة تفعيل الموعد داخل bookedSlots.
         */
        await setDoc(
          doc(
            db,
            "bookedSlots",
            makeSlotId(booking.selectedDate, booking.selectedTime),
          ),

          {
            bookingId: booking.id,

            selectedDate: booking.selectedDate,
            selectedTime: booking.selectedTime,

            active: true,

            updatedAt: serverTimestamp(),
          },

          {
            merge: true,
          },
        );

        /*
         * إزالة الحجز من السجل المؤقت.
         */
        setRecentPast((currentBookings) =>
          currentBookings.filter(
            (currentBooking) => currentBooking.id !== booking.id,
          ),
        );

        const restoredBooking = {
          ...booking,

          cancelledAt: null,
          cancelledBy: null,

          completedStatsCounted: false,
          completedStatsCountedAt: null,
        };

        const restoredBookingTime = bookingDateTime(restoredBooking);

        /*
         * إذا موعده ما زال بالمستقبل:
         * نعيده إلى الحجوزات القادمة.
         */
        if (restoredBookingTime && restoredBookingTime.getTime() > Date.now()) {
          setUpcoming((currentBookings) =>
            [...currentBookings, restoredBooking].sort(
              (firstBooking, secondBooking) => {
                const firstTime = bookingDateTime(firstBooking)?.getTime() || 0;

                const secondTime =
                  bookingDateTime(secondBooking)?.getTime() || 0;

                return firstTime - secondTime;
              },
            ),
          );

          return;
        }

        /*
         * إذا كان وقت الدور مرّ:
         *
         * - يبقى في السجل المؤقت.
         * - يعاد احتسابه لأنه أصبح غير ملغي.
         */
        setRecentPast((currentBookings) => [
          restoredBooking,
          ...currentBookings,
        ]);

        await syncPassedBookingsForCompletedStats([restoredBooking]);
      },

      /**
       * حذف دور من السجل.
       *
       * mode:
       *
       * NO_SHOW:
       * الزبون لم يأتِ، لذلك ينقص من الإحصائيات.
       *
       * DELETE_ONLY:
       * الدور صار فعليًا، لذلك يبقى محسوبًا.
       */
      async deleteBookingForever(booking, mode = "DELETE_ONLY") {
        await deletePastBookingWithStats(booking.id, mode);

        setRecentPast((currentBookings) =>
          currentBookings.filter(
            (currentBooking) => currentBooking.id !== booking.id,
          ),
        );
      },
    };
  }, []);

  return {
    upcoming,
    recentPast,

    loading,
    lastUpdated,

    actions,
  };
}
