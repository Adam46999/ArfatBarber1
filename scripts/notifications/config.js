// scripts/notifications/config.js

/**
 * إعدادات نظام الإشعارات
 * هذا الملف فقط إعدادات — بدون منطق
 * أي تعديل مستقبلي (توقيت/إلغاء/إضافة تذكير) يتم من هنا
 */

export const CONFIG = {
  // اسم collection الحجوزات في Firestore
  COLLECTION: "bookings",

  /**
   * GitHub Action يعمل كل 5 دقائق
   * WINDOW_MIN = نافذة أمان (± دقائق)
   * عشان ما نضيّع إشعار إذا صار تأخير بسيط
   */
  WINDOW_MIN: 6,

  /**
   * إشعار "عند الحجز"
   * نبحث عن حجوزات جديدة خلال آخر X دقائق
   */
  LOOKBACK_CREATE_MIN: 45,

  /**
   * التذكيرات قبل الموعد
   * minutesBefore = كم دقيقة قبل الدور
   * key = الحقل الذي نعلّم فيه أن الإشعار انبعت
   */
  REMINDERS: [
    { key: "r24hSentAt", minutesBefore: 24 * 60 }, // قبل 24 ساعة
    { key: "r2hSentAt", minutesBefore: 2 * 60 }, // قبل ساعتين
    { key: "r30mSentAt", minutesBefore: 30 }, // قبل 30 دقيقة
  ],
};
