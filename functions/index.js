/* eslint-disable */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendBookingNotification = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();

    const token = booking.fcmToken;
    const name = booking.fullName || "زبون";
    const time = booking.selectedTime || "بدون وقت";
    const date = booking.selectedDate || "بدون تاريخ";

    // استخراج اسم اليوم من التاريخ
    const weekdayName = new Date(date).toLocaleDateString("ar-EG", {
      weekday: "long",
    });

    if (!token) {
      console.log("🚫 لا يوجد fcmToken في الحجز");
      return null;
    }

    const message = {
      notification: {
        title: "✂️ تم تأكيد حجزك!",
        body: `موعدك الساعة ${time} ليوم ${weekdayName} – نراك قريبًا في Arfat Barber!`,
      },
      token: token,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("✅ إشعار تم إرساله:", response);
    } catch (error) {
      console.error("❌ فشل إرسال الإشعار:", error);
    }
  });
